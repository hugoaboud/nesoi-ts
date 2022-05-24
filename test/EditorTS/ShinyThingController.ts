import ZeroAuth from '../../src/Auth/ZeroAuth';
import { ResourceController } from '../../src/Controller';
import ShinyThing from './ShinyThing';

export default class PortalController extends ResourceController(
    ShinyThing,
    'portals',
    ZeroAuth,
    [
        { transition: 'break' }
    ]
){}