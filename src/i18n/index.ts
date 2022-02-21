export interface i18nStrings {

    Validator: {
        ExceptionMessage: string,
        RuleNames: {
            required: string,
            requiredWhen: string,
            requiredIfNotExists: string,
            requiredIfExists: string,
            string: string,
            number: string,
            enum: string,
            boolean: string,
            date: string,
            object: string,
            array: string,
            minLength: string
        }
    }

    Schema: {
        RuleExceptions: {
            greaterThan: string
        }
    }

}

//const i18n = require('./'+process.env.GRAPH_DB_I18N).default as i18nStrings;
const i18n = require('./pt-br').default as i18nStrings;
export default i18n;