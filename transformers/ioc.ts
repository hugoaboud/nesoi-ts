import { iocTransformer } from '@adonisjs/ioc-transformer';
import * as ts from 'typescript';
import adonisrc from "../.adonisrc.json"

export default function IocTransformer() {
    return {
        after: iocTransformer(ts, adonisrc)
    }
}