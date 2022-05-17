import { Schema, Prop, InputProp, Transition, Type, Resource } from '../../src/index';
import ShinyThingModel from './ShinyThingModel';

const _ = Prop<ShinyThingModel>()
const $ = InputProp
const S = Schema({

    Model: ShinyThingModel,

    // 1. Prop argument is typed based on the model
    // 2. Prop without type cannot be assigned
    Output: {
        name:           _('name').string,
        price:          _('price').money,
        decoration: {
            color:      _('color').int,
            shininess:  _('shininess').decimal
        }
    },

    // 3. State 'created' must exist
    // 4. States must declare an alias
    States: {
        created:  { alias: 'Criado' },
        broken:   { alias: 'Quebrada' },
        deleted:  { alias: 'Excluído' }
    },

    Transitions: {

        // 5. Transition 'create' must exist
        // 6. Transition 'create' must be from 'void'
        // 7. Transition 'create' must be to 'created'
        create: Transition({
            alias: 'Criar',
            from: 'void',
            to: 'created',
            // 8. InputProp without type cannot be assigned
            // 9. InputProp should have generic type according to schema type
            // 10. Optional should show up as | undefined in generic
            input: {
                name:           $('Nome').string.noDuplicate('code'),
                price:          $('Preço').float.optional(0),
                decoration:     $('Decoração').object({
                    color:      $('Cor').enum(['red','blue','green'] as const),
                    shininess:  $('Brilhância').float
                // 11. Default value for optional object should be typed according to schema
                }).optional({
                    color: 'red',
                    shininess: 0.3
                })
            },
            // 12. Input argument should be typed according to schema
            fn: async (obj: ShinyThingModel, input) => {
                obj.name = input.name;
                obj.price = input.price!;                
                obj.color = {
                    'red': 1,
                    'blue': 2,
                    'green': 3
                }[input.decoration!.color];
                obj.shininess = input.decoration!.shininess;
            },
        }),

        // 13. Additional transitions should not be required
        break: Transition({
            alias: 'Quebrar',
            from: 'created',
            to: 'broken',
            input: {}
        })

    }
})
type S = typeof S;
interface $ extends S {}

type ShinyThing = Type<typeof S>;
const ShinyThing = new Resource<ShinyThing, $>(S);
export default ShinyThing;