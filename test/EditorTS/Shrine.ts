import * as R from '../../src/Resource';
import * as Service from '../../src/Resource/Service';
import WorldService from './WorldService';

interface ShrineModel extends Service.BaseModel {
    name: string
    place: {
        planet: string
        lat: number
        lon: number
    }
}

const _ = R.Prop<ShrineModel>()
const S = Service.Schema<ShrineModel>()({

    Service: WorldService,
    Route: 'shrines',
    
    Format: obj => obj,

    Output: {
        extra: _('name').string
    },

    Transitions: {

        create: Service.Transition<{
            name: string
        }>({
            verb: 'post',
            url: '/'
        }),

        travel: Service.Transition<{
            planet: 'Mars' | 'Jupiter'
        }>({
            verb: 'post',
            url: '/travel'
        })

    }
})

type S = typeof S;
export interface $Shrine extends S {}
type Shrine = Service.Type<S>;
const Shrine = new Service.Resource<Shrine, $Shrine>(S);
export default Shrine;

// async function main() {
//     let a = await Shrine.create({} as any, {
//         name: 'Moon Shrine'
//     });
//     let as = await Shrine.createMany({} as any,[{
//         name: 'Moon Shrine'
//     },{
//         name: 'Jupiter Shrine'
//     }])
//     a.travel({
//         planet: 'Jupiter'
//     });

//     a.travel({
//         planet: 'Mars'
//     })

// }