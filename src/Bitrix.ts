import axios, { Axios, AxiosResponse } from 'axios';


interface Container {
    [key: string]: Field;
}
interface Field {
    type: string,
    isRequred: boolean,
}

export class Bitrix {

    public static async contactFields(): Promise<AxiosResponse<{result: Container}>> {
        return await axios.get(process.env.WEBHOOK_URL+ 'crm.contact.fields');
    }

    public static async createContact(username: string, phone: string, name?: string): Promise<AxiosResponse<{result: number}>> {
        const res = await axios.get(process.env.WEBHOOK_URL + 'crm.contact.add.json', {
            params: {
                fields: {
                    "NAME": name,
                    "PHONE": phone,
                    "UF_CRM_1718783399": username
                },
                params: {
                    "REGISTER_SONET_EVENT": "Y"
                }
            }
        });
        return res;
    }



    public static async dealFields(): Promise<AxiosResponse<{result: Container}>> {
        return await axios.get(process.env.WEBHOOK_URL+ 'crm.deal.fields');
    }

    public static async createDeal(botPhone: string, callTime: string, segment: string, comment: string, dialog: string): Promise<AxiosResponse<{result: number}>> {
        return await axios.post(process.env.WEBHOOK_URL+'crm.deal.add', {
            fields: {
                "UF_CRM_1718783932": botPhone,
                "UF_CRM_1718783952": callTime,
                "UF_CRM_1705043524805": segment,
                "COMMENTS": comment,
                "ASSIGNED_BY_ID": 39,
                "CATEGORY_ID": 77,
                "STAGE_ID": "С77:NEW",
                "BEGINDATE": (new Date()).toISOString(),
                "UF_CRM_1719146021": dialog
            },
            params: {
                "REGISTER_SONET_EVENT": "Y"
            }
        });
    }

    public static async addContact(contactId: number, dealId: number) {
        const r = await axios.get(process.env.WEBHOOK_URL+'crm.deal.contact.add', {
            params: {
                "id": dealId,
                fields: {
                    "CONTACT_ID": contactId,
                    "SORT": 0,
                    "IS_PRIMARY": "Y"
                }
            }
        });
    }

}