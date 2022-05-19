import * as R from ".";
import { Verb } from "../Util/Service";

namespace Service {

    /* Model */

    /* Schema */

    export type Schema<T> = Omit<R.Schema,'Transitions'> & {
        Transitions: Record<string, TransitionSchema>
    }

    /* Transition */

    export interface Transition {
        verb: Verb
        url: string
    }
    export function Transition(transition: Transition) { return transition; }
    
    export type TransitionSchema = Record<string, Transition>
    
    /* State Machine */
    
    export class Resource<T, S extends R.Schema> extends R.Resource<T,S> {
    
    
        
    }

}
