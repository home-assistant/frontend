export interface ReceivedMessage<T> {
  gj: boolean;
  data: T;
  senderId: string;
  type: "message";
}
