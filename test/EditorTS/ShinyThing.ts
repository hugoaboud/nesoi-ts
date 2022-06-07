import { $ } from '../../src/Resource';
import Particle from './Particle';
import ShinyThingModel from './ShinyThingModel';
import Shrine from './Shrine';

const i = $.InputProp
const o = $.Prop<ShinyThingModel>()

class $ShinyThing extends $.Schema({

    Model: ShinyThingModel,
    Alias: 'Coisa Brilhante',

    Output: {
        name:           o('name').string,
        price:          o('price').money,
        decoration: {
            color:      o('color').int,
            shininess:  o('shininess').decimal
        }
    },

    States: {
        created: 'Criada',
        broken:  'Quebrada',
        deleted: 'Excluída'
    },

    Transitions: {

        create: $.Transition({
            alias: 'Criar',
            from: 'void',
            to: 'created',
            input: {
                name:           i('Nome').string.noDuplicate('code'),
                price:          i('Preço').float.default(0),
                decoration:     i('Decoração').object({
                    color:      i('Cor').enum(['red','blue','green'] as const),
                    shininess:  i('Brilhância').float
                }).default({
                    color: 'red',
                    shininess: 0.3
                }),
                shrine_id:      i('ID do Shrine').id(Shrine),
                shrine:         i('Shrine').child(Shrine, 'create'),
                particle_ids:   i('IDs das Partículas').id(Particle).array()
            },
            fn: async (obj: ShinyThingModel, input) => {
                obj.name = input.name;
                obj.price = input.price!;                
                obj.color = {
                    'red': 1,
                    'blue': 2,
                    'green': 3
                }[input.decoration.color];
                
                input.$shrine.id
                input.shrine.color
                input.$particles[0].id

                obj.shininess = input.decoration.shininess;
            },
        }),

        break: $.Transition({
            alias: 'Quebrar',
            from: 'created',
            to: 'broken',
            input: {
                nada: i('Nada').int
            }
        })

    },

    Hooks: [
        // {
        //     on: 'enter',
        //     state: 'broken',
        //     fn: async (obj: ShinyThingModel, client, run) => {
        //         run('create', {

        //         })
        //     }
        // }
    ]
}){}

type ShinyThing = $.Type<$ShinyThing>;
const ShinyThing = new $.Machine<ShinyThing, $ShinyThing>($ShinyThing.$);
export default ShinyThing;