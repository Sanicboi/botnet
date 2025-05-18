export interface IView {
  send(to: number): Promise<void>;
}
