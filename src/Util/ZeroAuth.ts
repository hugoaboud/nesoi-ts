import { Client, EndpointAuth, User } from "./Auth";

export default class ZeroAuth extends EndpointAuth {
    
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