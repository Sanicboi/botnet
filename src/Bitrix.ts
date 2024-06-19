import axios, { AxiosResponse } from 'axios';


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
        const res = await axios.get(process.env.WEBHOOK_URL + 'crm.contact.add', {
            params: {
                fields: {
                    "NAME": name,
                    "PHONE": phone,
                    "UF_CRM_1718783399": username
                },
                params: {
                    "REGISTER_SONET_EVENT": "N"
                }
            }
        });
        return res;
    }

    public static async dealFields(): Promise<AxiosResponse<{result: Container}>> {
        return await axios.get(process.env.WEBHOOK_URL+ 'crm.deal.fields');
    }

    public static async createDeal(botPhone: string, callTime: string, segment: string, comment: string, contact: number) {
        await axios.get(process.env.WEBHOOK_URL+'crm.deal.add', {
            params: {
                "UF_CRM_1718783932": botPhone,
                "UF_CRM_1718783952": callTime,
                "UF_CRM_1705043524805": segment,
                "COMMENTS": comment,
                "ASSIGNED_BY_ID": 39,
                "CATEGORY_ID": 77,
                "STAGE_ID": "NEW",
                "CONTACT_IDS": [contact]
            }
        });
    }

}