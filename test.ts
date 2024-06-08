import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

const session = new StringSession("1AgAOMTQ5LjE1NC4xNjcuNDEBuxsU94MMdiIcPAg4MzZqoGFY2M1ueSIFzvWElgsw0mxHpqHGIRjb4JxUk+TRs/Izv+dc0A4Pe/Iu92HOf3BAbOtk7Dp2wRxes3foz7VizelprQ4C12BkFGFJm9FgESdQw/y2GHYSNWD77AM6lzSz+3XLdC2R8cvX/oGnB8AC8Av5Fs8Btv+1560cjEAk+BR/D2WhemCmAPANuWZgI8hdHjplZNbdC7gu+19aQPn5pNQRX1rtfwftPwMlQXiWsKrMrTJmbOluNAjbYqdAl7Wt0Ukq4qClRBR1FoKm2xGetJB0l1Xoz1xlaRikehmsW7xDEq+/r3cN/Sr0H1nB4u69RPg=");
const client = new TelegramClient(session, 28082768, "4bb35c92845f136f8eee12a04c848893", {});
client.start({
    phoneCode: async () => "",
    phoneNumber: async () => "",
    onError: () => {}
}).then(async () => {

    let dialogs = await client.getDialogs({});
    dialogs = dialogs.filter(el => el.inputEntity.className === 'InputPeerUser');
    let messages = dialogs.map(el => el.message.text);
    messages = messages.filter(el => el.startsWith('Приветствую, меня зовут Сергей, я являюсь сооснователем бизнес клуба Legat Business.'));
    console.log(messages)
})