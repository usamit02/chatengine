import { User, USER } from './class'
export interface State {
  user: User,
}


export const initialState = {
  user: USER,
}