import axios from 'axios';
import express from 'express';


export class Whatsapp {
    public server: express.Application;
    constructor () {
        this.server = express();
        this.server.use(express.json());
        this.server.post('/api/message', async (req, res) => {
            if (req.body.test === true) {
                return res.status(200).end();
                // TODO
            }
        });
    }

    public async connect() {
        await axios.patch('https://api.wazzup24.com/v3/webhooks', {
            webhooksUri: process.env.BASE_URL + '/api/message',
            subscriptions: {
                messagesAndStatuses: true,
                contactsAndDealsCreation: false,
                channelsUpdates: false,
                templateStatus: false
            }
        }, {
            headers: {
                Authorization: `Bearer ${process.env.WAZZUP_KEY}`
            }
        })
    }

    public async listTemplates() {
        const res = await axios.get('https://api.wazzup24.com/v3/templates/whatsapp', {
            headers: {
                Authorization: `Bearer ${process.env.WAZZUP_KEY}`
            }
        })
    }

    public listen() {
        this.server.listen(8082);
    }
}

