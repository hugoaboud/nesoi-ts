// import { $Service as $ } from '../../src/Resource';
// import WorldService from './WorldService';

// const o = $.Prop<ShrineModel>()

// export interface ShrineModel extends $.BaseModel {
//     name: string
//     place: {
//         planet: string
//         lat: number
//         lon: number
//     }
// }

// export class $Shrine extends $.Schema<ShrineModel>()({

//     Service: WorldService,
//     Version: 'v1',
    
//     Name: 'Shrine',
//     Alias: 'Fonte',
//     Route: 'shrines',
    
//     Parse: obj => {
//         return {
//             planet: obj.place.planet
//         }
//     },

//     Output: {
//         extra: o('name').string
//     },

//     Transitions: {

//         create: $.Transition<{
//             name: string
//         }>({
//             verb: 'post',
//             url: '/'
//         }),

//         // travel: $.Transition<{
//         //     planet: 'Mars' | 'Jupiter'
//         // }>({
//         //     verb: 'post',
//         //     url: '/travel'
//         // })

//     }
// }){}

// type Shrine = $.Type<$Shrine>;
// const Shrine = new $.Machine<Shrine, $Shrine>($Shrine.$);

// export default Shrine;