import { IncomingHttpHeaders } from 'http'
import { OAuthClient } from '../Auth/Helpers/OAuth';
import ServiceException from '../Exception/ServiceException';
import Service from '.';

/**
 * Service: **Auth**, the iCertus authentication service
 */
export default class AuthService extends Service {

    static alias = 'iCertus Auth'
    static base_url = process.env.ICERTUS_AUTH_BASE_URL!

    endpoints = {}

    public static async verify(headers: IncomingHttpHeaders): Promise<OAuthClient> {

        if (!('authorization' in headers))
            throw ServiceException.InvalidAuthHeaders(this.alias);       
        if (!(headers.authorization?.includes('Bearer')))
            throw ServiceException.InvalidAuthHeaders(this.alias);

        const client = { 
            tokens: {
                authorization: headers.authorization
            }
        } as any;
        let auth = await this.request(client,'get','/oauth/verify').catch(e => {
            throw ServiceException.AuthFailed(this.alias, e);
        })

        return {
            bearer: headers['authorization'],
            ...auth
        };
    }

    // public static async refresh(client_id: string, client_secret: string, refresh_token: string): Promise<string> {

    //     let authorization = 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64');
        
    //     const Auth = new this({ authorization });
        
    //     let response = await Auth.request('post','/oauth/token',undefined,undefined,{
    //         grant_type: 'refresh_token',
    //         refresh_token
    //     }).catch(_ => {
    //         throw ServiceException.RefreshFailed(this.alias);
    //     })

    //     return response.access_token;
    // }

}
