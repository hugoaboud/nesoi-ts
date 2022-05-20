import { Auth } from ".";
import { Client, User } from "./Client";

export default class ZeroAuth extends Auth {
    
    async auth(): Promise<Client> {
        return new Promise(resolve => {
            const user = {
                id: 0
            } as User;
            resolve(new Client(user));
        })
    }

    error(): string {
        return 'ZeroAuth failed'
    }
}