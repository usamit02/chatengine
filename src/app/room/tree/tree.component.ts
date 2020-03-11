import { Component, OnInit, AfterViewInit, Input, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TREE_ACTIONS, KEYS, ITreeOptions, TreeNode, TreeModel } from 'angular-tree-component';
import { ApiService } from './../../service/api.service';
@Component({
  selector: 'app-tree',
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.scss'],
})
export class TreeComponent implements OnInit, AfterViewInit {
  @Input() prop;
  @ViewChild('tree', { static: false }) tree;
  nodes = [];
  options: ITreeOptions = {
    displayField: 'na',
    isExpandedField: 'expanded',
    idField: 'id',
    hasChildrenField: 'nodes',
    actionMapping: {
      mouse: {
        dblClick: (tree: TreeModel, node: TreeNode, e: MouseEvent) => {
          if (node.hasChildren) TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, e);
        },
        contextMenu: (tree: TreeModel, node: TreeNode, e) => {
          e.preventDefault();
          if (this.contextMenu && node === this.contextMenu.node) {
            return this.closeMenu();
          }
          return;//開発中につきコンテクストメニューを出さない
          this.contextMenu = {
            node: node,
            x: e.layerX,
            y: e.layerY
          };
        },
        click: (tree: TreeModel, node: TreeNode, e: MouseEvent) => {
          this.closeMenu();
          TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, e);
        },
        drop: (tree: TreeModel, node: TreeNode, e: MouseEvent, { from, to }) => {
          if (from.data.ack < 1 || this.prop.user.admin || node.data.user === this.prop.user.id && from.data.user === this.prop.user.id) {
            tree.moveNode(from, { parent: node, index: to.index });
            this.change = true;
          } else {
            alert("権限がありません。");
          }
        }
      },
      keys: {
        [KEYS.ENTER]: (tree, node, $event) => {
          node.expandAll();
        }
      }
    },
    nodeHeight: 23,
    allowDrag: (node) => {
      return true;
    },
    allowDrop: (node) => {
      return true;
    }
  }
  contextMenu: { node: TreeNode, x: number, y: number } = null;
  sourceNode: TreeNode = null;
  editNode: TreeNode = null;
  doCut = false;
  change = false;
  constructor(private api: ApiService, public modal: ModalController, ) { }
  ngOnInit() {
    this.getNode(this.prop.datas);
  }
  ngAfterViewInit() {
    this.tree.treeModel.getNodeById(this.prop.id).focus();//.setActiveAndVisible();
    let parent = Number(this.prop.id);
    while (parent != null) {
      this.tree.treeModel.getNodeById(parent).expand();
      let parentNode = this.prop.datas.filter(data => { return data.id === parent; })[0];
      parent = parentNode.parent;
    }
  }
  getNode(datas) {
    const addNodes = (parent) => {
      let childs = [];
      const children = datas.filter(data => { return data.parent === parent; });
      for (let child of children) {
        const res = addNodes(child.id);
        if (res.length) { child.children = res; }
        childs.push(child);
      }
      return childs;
    }
    this.nodes = addNodes(null);
  }
  closeMenu = () => {
    this.contextMenu = null;
  }
  copy = () => {
    this.sourceNode = this.contextMenu.node;
    this.doCut = false;
    this.closeMenu();
  }
  cut = () => {
    this.sourceNode = this.contextMenu.node;
    this.doCut = true;
    this.closeMenu();
  }
  paste = () => {
    if (!this.canPaste()) {
      return;
    }
    this.doCut
      ? this.sourceNode.treeModel.moveNode(this.sourceNode, { parent: this.contextMenu.node, index: 9999999999999 })
      : this.sourceNode.treeModel.copyNode(this.sourceNode, { id: 999, parent: this.contextMenu.node, index: 9999999999999 });
    this.sourceNode = null;
    this.change = true;
    this.closeMenu();
  }
  canPaste = () => {
    if (!this.sourceNode) {
      return false;
    }
    return this.sourceNode.treeModel.canMoveNode(this.sourceNode, { parent: this.contextMenu.node, index: 0 });
  }
  edit = () => {
    this.editNode = this.contextMenu.node;
    this.closeMenu();
  }
  saveEdit = () => {
    this.change = true;
    this.editNode = null;
  }
  stopEdit = () => {
    this.editNode = null;
  }
  add = (tree) => {
    let node = this.contextMenu.node;
    const insert = { parent: node.id }
    this.api.post("query", { insert: insert, table: this.prop.page }).then(res => {//新しい部屋を追加してidを取得
      if (!node.data.children) node.data.children = [];
      node.data.children.push({ id: res[this.prop.page].id, ...insert });
      tree.treeModel.update();
      tree.treeModel.getNodeById(node.id).expand();
      let editNode = tree.treeModel.getNodeById(res[this.prop.page].id);
      this.editNode = editNode;
    });
    this.closeMenu();
  }
  del = (tree) => {
    this.change = true;
    let node = this.contextMenu.node;
    let parentNode = node.realParent ? node.realParent : node.treeModel.virtualRoot;
    if (node.data.children && !confirm("下層部屋もまとめて削除しますか？")) {
      for (let i = 0; i < node.data.children.length; i++) {
        parentNode.data.children.push(node.data.children[i]);
      }
    }
    parentNode.data.children = parentNode.data.children.filter(child => { return child !== node.data; });//_.remove(parentNode.data.children, function (child) {return child === node.data;});    
    tree.treeModel.update();
    this.closeMenu();
    if (node.parent.data.children.length === 0) {
      node.parent.data.hasChildren = false;
    }
  }
  filterFn(value: string, treeModel: TreeModel) {
    treeModel.filterNodes((node: TreeNode) => this.fuzzysearch(value, node.data.name));
  }
  undo() {
    this.getNode(this.prop.datas);
    this.change = false;
  }
  save() {
    let columns = [];
    if (this.change) {
      let updates = [];
      const addNode = (node) => {
        if (node.children) {
          for (let i = 0; i < node.children.length; i++) {
            let update: any = {};
            if (node.children[i].idx !== i) update.idx = i; node.children[i].idx = i;
            if (node.children[i].parent !== node.id) update.parent = node.id; node.children[i].parent = node.id;
            if (Object.keys(update).length) {
              updates.push({ update: update, where: { id: node.children[i].id } });
            }
            columns.push(node.children[i]);
            addNode(node.children[i]);
          }
        }
      }
      addNode(this.nodes[0]);
      columns.push(this.nodes[0]);
      if (updates.length) {
        this.api.post('querys', { updates: updates, table: this.prop.page });
      }
    }
    this.modal.dismiss({
      id: this.tree.treeModel.focusedNodeId, columns: columns.map(column => { delete column.children; return column; })
    });
  }
  private fuzzysearch(needle: string, haystack: string) {
    const haystackLC = haystack.toLowerCase();
    const needleLC = needle.toLowerCase();
    const hlen = haystack.length;
    const nlen = needleLC.length;
    if (nlen > hlen) {
      return false;
    }
    if (nlen === hlen) {
      return needleLC === haystackLC;
    }
    outer: for (let i = 0, j = 0; i < nlen; i++) {
      const nch = needleLC.charCodeAt(i);
      while (j < hlen) {
        if (haystackLC.charCodeAt(j++) === nch) {
          continue outer;
        }
      }
      return false;
    }
    return true;
  }
}
