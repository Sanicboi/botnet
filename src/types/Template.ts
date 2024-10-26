export interface Template {
  templateGuid: string;
  accountId: number;
  title: string;
  name: string;
  waba: {
    wabaId: string;
    wabaName: string;
  };
  category: string;
  language: string;
  status: string;
  rejected_reason?: string;
  namespace: string;
  components: {
    type: "HEADER" | "FOOTER" | "BUTTONS" | "BODY";
    format?: "IMAGE" | "DOCUMENT" | "VIDEO" | "TEXT";
    text?: string;
    example: string[];
    buttons?: {
      type: "URL" | "QUICK_REPLY" | "PHONE_NUMBER";
      text: string;
      url?: string;
    }[];
  }[];
}
