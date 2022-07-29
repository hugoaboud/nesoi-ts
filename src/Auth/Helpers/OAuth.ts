import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { DateTime } from 'luxon';
import { Validator } from '../../Util/Validator';
import { schema } from '@ioc:Adonis/Core/Validator'
import axios from 'axios';
import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { Status } from '../../Exception';
import AuthService from '../../Service/AuthService';
import { URL } from 'url';
import { Client, User } from '../Client';

export interface OAuthClient {
    bearer: string
    client_id: string
    scope: string[]
    user: User
}

export interface OAuthToken {
    access: string
    refresh: string
}

export interface OAuthSession {
    client: OAuthClient
    token: OAuthToken
}

export default class OAuth {

    constructor() {}

    static async RequestOwnerAuth(ctx: HttpContextContract) {
            
        let url = new URL(process.env.OAUTH_AUTH_URL!);

        url.searchParams.append('response_type', 'code')
        url.searchParams.append('client_id', process.env.OAUTH_CLIENT_ID!)
        url.searchParams.append('redirect_uri', process.env.OAUTH_REDIRECT_URL!)
        url.searchParams.append('scope', 'core')
        url.searchParams.append('state', DateTime.now().toMillis().toString())
        
        let t = ctx.request.header('Authorization')?.replace('Bearer ','')!;
        url.searchParams.append('access', t)

        ctx.response.redirect(url.href);

        return null;
    }

    static async AuthFromCodeRedirect(ctx: HttpContextContract): Promise<OAuthSession> {
            
        let input = ctx.request.qs();

        let validator = new Validator('OAuthClient', {
            code: schema.string(),
            state: schema.string()
        },{});
        await validator.validate(input);

        let response = await axios.post(process.env.OAUTH_TOKEN_URL!,
        {
            grant_type: 'authorization_code',
            code: input.code,
            redirect_uri: process.env.OAUTH_REDIRECT_URL!
        }, {
            headers: await this.ClientCredentialsHeader()
        }).catch(e => {
            if (e.status == Status.UNAUTHORIZED)
                throw Exception.InvalidCode()
            else
                throw Exception.ConnectionError(e)
        });

        return {
            client: await this.Verify(response.data.access_token),
            token: {
                access: response.data.access_token,
                refresh: response.data.refresh_token
            }
        }
    }

    private static async ClientCredentialsHeader() {
        let client_id = process.env.OAUTH_CLIENT_ID!;
        let client_secret = process.env.OAUTH_CLIENT_SECRET!;

        let buffer = Buffer.from(client_id+':'+client_secret, 'utf-8');
        return {
            'Authorization': 'Basic ' + buffer.toString('base64')
        } 
    }
    
    static async Verify(access_token: string): Promise<OAuthClient> {
        return AuthService.verify({
            authorization: 'Bearer ' + access_token
        });
    }
    
    static async ClientFromToken(access_token: string): Promise<Client> {
        let data = await this.Verify(access_token);
        return new Client(data.user, {
            authorization: 'Bearer ' + access_token
        });
    
    }
    static async ClientFromHeaders(headers: Record<string,any>): Promise<Client> {
        let data = await AuthService.verify(headers);
        return new Client(data.user, {
            authorization: data.bearer
        });
    }

    // static async Refresh(refresh_token: string): Promise<string> {
    //     return AuthService.refresh(
    //         process.env.OAUTH_CLIENT_ID!,
    //         process.env.OAUTH_CLIENT_SECRET!,
    //         refresh_token
    //     );
    // }
}

class Exception extends BaseException {

    static code = 'E_OAUTH_CLIENT'
    
    static InvalidCode() {
        return new this('Código inválido', Status.UNAUTHORIZED, this.code)
    }
    
    static ConnectionError(e: BaseException) {
        console.error(e);
        return new this('[OAuth] Erro de Conexão', Status.UNAUTHORIZED, this.code)
    }
}