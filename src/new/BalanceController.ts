import { User } from "../entity/User";



/**
 * This class is made to handle the balance of the user
 */
export class BalanceController {



    constructor() {}


    /**
     * Checks the balance and sends the message if not sufficient funds are given 
     * @param user 
     */
    public async checkBalance(user: User): Promise<{
        exists: boolean,
        limit: number
    }> {

    }


}