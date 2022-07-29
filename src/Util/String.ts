export function CamelToSnakeCase(camel: string) {
    return camel.split(/(?=[A-Z])/).join('_').toLowerCase();
}

export function URLparams(url: string) {
    return url.split('/').filter(p => p[0] === ':').map(p => p.slice(1));
}

export function randomID(length = 16) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < length; i++) {
        var r = Math.floor(Math.random() * charset.length);
        id += charset[r];
    }
    return id;
}