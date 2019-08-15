
/**
 * Convert [ 'a=1', 'b=c' ] to { a: 1, b: c }
 */
function to_map(list, separator) {
    let obj = {};
    for (let param of list) {
        let parts = param.split(separator);
        if (parts.length !== 2) continue;
        obj[parts[0]] = parts[1];
    }
    return obj;
}

Array.prototype.splitToObject = function(separator) {
    let obj = {};
    for (let param of this) {
        let i = param.indexOf(separator);
        if (i === -1) continue;
        let parts = param.split(separator);
        if (parts.length !== 2) continue;
        obj[parts[0]] = parts[1];
    }
    return obj;
}

function query_params() {
    let str = decodeURIComponent(window.location.search);
    if (str.startsWith('?')) {
        str = str.substr(1);
    }
    return to_map(str.split('&'), '=');
}

function perma_query(params) {
    let query = [];
    for (let i in params) {
        let p = params[i];
        let element = document.getElementById(p);
        // TODO walk parents?
        if (element.parentElement.style.display === 'none') continue;
        query.push(p + '=' + element.value);
    }
    return query.join('&');
}
