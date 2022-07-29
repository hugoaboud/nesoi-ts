// // v0.7
// // @ts-nocheck

// import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
// import Route from '@ioc:Adonis/Core/Route'
// import OAuth, { OAuthSession } from './OAuth';
// import WorkerToken from '../Database/Model/WorkerToken';

// export default class WorkerAuth {
    


//     static async request(ctx: HttpContextContract) {
//         return OAuth.RequestOwnerAuth(ctx);
//     }

//     static async redirect(ctx: HttpContextContract) {
//         let auth = await OAuth.AuthFromCodeRedirect(ctx);
//         await this.Update(auth);

//         return `<html><body onload="parent.postMessage('oauth_done','*');"></html>`
//     }

//     static async Update(auth: OAuthSession) {
//         let user = auth.client.user;

//         let token = await WorkerToken.findBy('company_id', user.company_id);
//         if (!token) token = new WorkerToken();

//         token.access_token = auth.token.access;
//         token.refresh_token = auth.token.refresh;
//         token.company_id = user.company_id;
//         token.created_by = user.id;
        
//         await token.save();

//         return {
//             msg: "OAuth Token atualizado",
//             expires_at: ''
//         };
//     }

//     static routes() {
//         Route.get("/auth/request", async(ctx) => this.request(ctx)).middleware('auth')
//         Route.get("/auth/redirect", async(ctx) => this.redirect(ctx))
//     }

// }