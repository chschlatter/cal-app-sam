/** 
Validate a request against the OpenAPI spec
@param {{ method: string; path: string; body?: any; query: Record<string, string | string[]>; headers: Record<string, string>; }} request - Input request to validate
@param {{ stringFormats?: { [format: string]: (value: string, path: string[]) => ValidationError | string | null } }} [context] - Context object to pass to validation functions
@returns {{ operationId?: string; params: Record<string, string>; query: Record<string, string | string[]>; body?: any; headers: Record<string, string>; }}
*/
export function validateRequest(request, context) {
    const match0 = request.path.match(obj8);
    if (match0 !== null) {
        return obj0(request, match0, context);
    }
    const match1 = request.path.match(obj14);
    if (match1 !== null) {
        return obj9(request, match1, context);
    }
    const match2 = request.path.match(obj17);
    if (match2 !== null) {
        return obj15(request, match2, context);
    }
    const match3 = request.path.match(obj20);
    if (match3 !== null) {
        return obj18(request, match3, context);
    }
    const match4 = request.path.match(obj25);
    if (match4 !== null) {
        return obj21(request, match4, context);
    }
    const match5 = request.path.match(obj28);
    if (match5 !== null) {
        return obj26(request, match5, context);
    }
    const match6 = request.path.match(obj31);
    if (match6 !== null) {
        return obj29(request, match6, context);
    }
    const match7 = request.path.match(obj34);
    if (match7 !== null) {
        return obj32(request, match7, context);
    }
    return new RequestError(404, 'no operation match path');
}
/** 
Map of all components defined in the spec to their validation functions.
{Object.<string, <T>(path: string[], value: T, context: any) => (T | ValidationError)>}
*/
export const componentSchemas = {
    'CreateEventParams': obj5,
    'Event': obj12,
    'User': obj35,
    'LoginParams': obj23
};
export class RequestError extends Error {
    /** @param {number} code HTTP code for the error
@param {string} message The error message*/
    constructor(code, message) {
        super(message);
        /** @type {number} HTTP code for the error*/
        this.code = code;
    }
}
export class ValidationError extends RequestError {
    /** @param {string[]} path The path that failed validation
@param {string} message The error message*/
    constructor(path, message) {
        super(409, message);
        /** @type {string[]} The path that failed validation*/
        this.path = path;
    }
}
const obj3 = new RegExp('^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2} [+-]?\\d{2}:\\d{2})?$');
function obj2(path, value, context) {
    if (typeof value !== 'string') {
        return new ValidationError(path, 'expected a string');
    }
    if (!obj3.test(value)) {
        return new ValidationError(path, 'expected to match the pattern "^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2} [+-]?\\d{2}:\\d{2})?$"');
    }
    return value;
}
function obj1(request, pathMatch, context) {
    request.params = {};
    let queryParam0 = request.query['start'];
    if (queryParam0 === undefined) {
        return new RequestError(400, 'query parameter start is required');
    } else {
        const queryParamResult0 = obj2([
            'query',
            'start'
        ], queryParam0, context);
        if (queryParamResult0 instanceof ValidationError) {
            return queryParamResult0;
        }
        request.query['start'] = queryParamResult0;
    }
    let queryParam1 = request.query['end'];
    if (queryParam1 === undefined) {
        return new RequestError(400, 'query parameter end is required');
    } else {
        const queryParamResult1 = obj2([
            'query',
            'end'
        ], queryParam1, context);
        if (queryParamResult1 instanceof ValidationError) {
            return queryParamResult1;
        }
        request.query['end'] = queryParamResult1;
    }
    if (request.body !== undefined) {
        return new RequestError(400, 'body is not allowed');
    }
    return request;
}
function obj6(path, value, context) {
    if (typeof value !== 'string') {
        return new ValidationError(path, 'expected a string');
    }
    if (value.length < 1) {
        return new ValidationError(path, 'expected at least 1 characters');
    }
    if (value.length > 20) {
        return new ValidationError(path, 'expected at most 20 characters');
    }
    return value;
}
function obj7(path, value, context) {
    if (typeof value !== 'string') {
        return new ValidationError(path, 'expected a string');
    }
    const formatResult = context?.stringFormats?.['date']?.(value, path);
    if (formatResult instanceof ValidationError) {
        return formatResult;
    }
    if (typeof formatResult === 'string') {
        value = formatResult;
    }
    return value;
}
function obj5(path, value, context) {
    if (typeof value !== 'object' || value === null) {
        return new ValidationError(path, 'expected an object');
    }
    const keys = new Set(Object.keys(value));
    const value0 = value['title'];
    if (value0 !== undefined) {
        const result0 = obj6([
            ...path,
            'title'
        ], value0, context);
        if (result0 instanceof ValidationError) {
            return result0;
        }
        value['title'] = result0;
        keys.delete('title');
    } else {
        return new ValidationError(path, 'expected "title" to be defined');
    }
    const value1 = value['start'];
    if (value1 !== undefined) {
        const result1 = obj7([
            ...path,
            'start'
        ], value1, context);
        if (result1 instanceof ValidationError) {
            return result1;
        }
        value['start'] = result1;
        keys.delete('start');
    } else {
        return new ValidationError(path, 'expected "start" to be defined');
    }
    const value2 = value['end'];
    if (value2 !== undefined) {
        const result2 = obj7([
            ...path,
            'end'
        ], value2, context);
        if (result2 instanceof ValidationError) {
            return result2;
        }
        value['end'] = result2;
        keys.delete('end');
    } else {
        return new ValidationError(path, 'expected "end" to be defined');
    }
    return value;
}
function obj4(request, pathMatch, context) {
    request.params = {};
    if (request.body === undefined) {
        return new RequestError(400, 'body is required');
    } else {
        const body = obj5(['body'], request.body, context);
        if (body instanceof ValidationError) {
            return body;
        } else {
            request.body = body;
        }
    }
    return request;
}
function obj0(request, pathMatch, context) {
    if (request.method === 'get') {
        return obj1(request, pathMatch, context);
    }
    if (request.method === 'post') {
        return obj4(request, pathMatch, context);
    }
    return new RequestError(405, 'method not supported');
}
const obj8 = new RegExp('^\\/api2\\/events[\\/#\\?]?$', 'i');
function obj11(path, value, context) {
    if (typeof value !== 'string') {
        return new ValidationError(path, 'expected a string');
    }
    return value;
}
function obj12(path, value, context) {
    if (typeof value !== 'object' || value === null) {
        return new ValidationError(path, 'expected an object');
    }
    const keys = new Set(Object.keys(value));
    const value0 = value['id'];
    if (value0 !== undefined) {
        const result0 = obj11([
            ...path,
            'id'
        ], value0, context);
        if (result0 instanceof ValidationError) {
            return result0;
        }
        value['id'] = result0;
        keys.delete('id');
    } else {
        return new ValidationError(path, 'expected "id" to be defined');
    }
    const value1 = value['title'];
    if (value1 !== undefined) {
        const result1 = obj11([
            ...path,
            'title'
        ], value1, context);
        if (result1 instanceof ValidationError) {
            return result1;
        }
        value['title'] = result1;
        keys.delete('title');
    } else {
        return new ValidationError(path, 'expected "title" to be defined');
    }
    const value2 = value['start'];
    if (value2 !== undefined) {
        const result2 = obj7([
            ...path,
            'start'
        ], value2, context);
        if (result2 instanceof ValidationError) {
            return result2;
        }
        value['start'] = result2;
        keys.delete('start');
    } else {
        return new ValidationError(path, 'expected "start" to be defined');
    }
    const value3 = value['end'];
    if (value3 !== undefined) {
        const result3 = obj7([
            ...path,
            'end'
        ], value3, context);
        if (result3 instanceof ValidationError) {
            return result3;
        }
        value['end'] = result3;
        keys.delete('end');
    } else {
        return new ValidationError(path, 'expected "end" to be defined');
    }
    const value4 = value['color'];
    if (value4 !== undefined) {
        const result4 = obj11([
            ...path,
            'color'
        ], value4, context);
        if (result4 instanceof ValidationError) {
            return result4;
        }
        value['color'] = result4;
        keys.delete('color');
    }
    return value;
}
function obj10(request, pathMatch, context) {
    let pathParam0 = obj11([
        'path',
        'id'
    ], pathMatch[1], context);
    if (typeof pathParam0 == 'string') {
        pathParam0 = decodeURIComponent(pathParam0);
    }
    if (pathParam0 instanceof ValidationError) {
        return pathParam0;
    }
    request.params = { id: pathParam0 };
    if (request.body === undefined) {
        return new RequestError(400, 'body is required');
    } else {
        const body = obj12(['body'], request.body, context);
        if (body instanceof ValidationError) {
            return body;
        } else {
            request.body = body;
        }
    }
    return request;
}
function obj13(request, pathMatch, context) {
    let pathParam0 = obj11([
        'path',
        'id'
    ], pathMatch[1], context);
    if (typeof pathParam0 == 'string') {
        pathParam0 = decodeURIComponent(pathParam0);
    }
    if (pathParam0 instanceof ValidationError) {
        return pathParam0;
    }
    request.params = { id: pathParam0 };
    if (request.body !== undefined) {
        return new RequestError(400, 'body is not allowed');
    }
    return request;
}
function obj9(request, pathMatch, context) {
    if (request.method === 'put') {
        return obj10(request, pathMatch, context);
    }
    if (request.method === 'delete') {
        return obj13(request, pathMatch, context);
    }
    return new RequestError(405, 'method not supported');
}
const obj14 = new RegExp('^\\/api2\\/events(?:\\/([^\\/#\\?]+?))[\\/#\\?]?$', 'i');
function obj16(request, pathMatch, context) {
    request.params = {};
    if (request.body !== undefined) {
        return new RequestError(400, 'body is not allowed');
    }
    return request;
}
function obj15(request, pathMatch, context) {
    if (request.method === 'get') {
        return obj16(request, pathMatch, context);
    }
    return new RequestError(405, 'method not supported');
}
const obj17 = new RegExp('^\\/api2\\/users[\\/#\\?]?$', 'i');
function obj19(request, pathMatch, context) {
    request.params = {};
    if (request.body !== undefined) {
        return new RequestError(400, 'body is not allowed');
    }
    return request;
}
function obj18(request, pathMatch, context) {
    if (request.method === 'get') {
        return obj19(request, pathMatch, context);
    }
    return new RequestError(405, 'method not supported');
}
const obj20 = new RegExp('^\\/api2\\/auth[\\/#\\?]?$', 'i');
function obj24(path, value, context) {
    if (value === 'true') {
        value = true;
    }
    if (value === 'false') {
        value = false;
    }
    if (typeof value !== 'boolean') {
        return new ValidationError(path, 'expected a boolean');
    }
    return value;
}
function obj23(path, value, context) {
    if (typeof value !== 'object' || value === null) {
        return new ValidationError(path, 'expected an object');
    }
    const keys = new Set(Object.keys(value));
    const value0 = value['name'];
    if (value0 !== undefined) {
        const result0 = obj11([
            ...path,
            'name'
        ], value0, context);
        if (result0 instanceof ValidationError) {
            return result0;
        }
        value['name'] = result0;
        keys.delete('name');
    } else {
        return new ValidationError(path, 'expected "name" to be defined');
    }
    const value1 = value['stayLoggedIn'];
    if (value1 !== undefined) {
        const result1 = obj24([
            ...path,
            'stayLoggedIn'
        ], value1, context);
        if (result1 instanceof ValidationError) {
            return result1;
        }
        value['stayLoggedIn'] = result1;
        keys.delete('stayLoggedIn');
    }
    const value2 = value['gooleAuthJWT'];
    if (value2 !== undefined) {
        const result2 = obj11([
            ...path,
            'gooleAuthJWT'
        ], value2, context);
        if (result2 instanceof ValidationError) {
            return result2;
        }
        value['gooleAuthJWT'] = result2;
        keys.delete('gooleAuthJWT');
    }
    return value;
}
function obj22(request, pathMatch, context) {
    request.params = {};
    if (request.body === undefined) {
        return new RequestError(400, 'body is required');
    } else {
        const body = obj23(['body'], request.body, context);
        if (body instanceof ValidationError) {
            return body;
        } else {
            request.body = body;
        }
    }
    return request;
}
function obj21(request, pathMatch, context) {
    if (request.method === 'post') {
        return obj22(request, pathMatch, context);
    }
    return new RequestError(405, 'method not supported');
}
const obj25 = new RegExp('^\\/api2\\/login[\\/#\\?]?$', 'i');
function obj27(request, pathMatch, context) {
    request.params = {};
    if (request.body !== undefined) {
        return new RequestError(400, 'body is not allowed');
    }
    return request;
}
function obj26(request, pathMatch, context) {
    if (request.method === 'get') {
        return obj27(request, pathMatch, context);
    }
    return new RequestError(405, 'method not supported');
}
const obj28 = new RegExp('^\\/api2\\/prices[\\/#\\?]?$', 'i');
function obj30(request, pathMatch, context) {
    request.params = {};
    if (request.body !== undefined) {
        return new RequestError(400, 'body is not allowed');
    }
    return request;
}
function obj29(request, pathMatch, context) {
    if (request.method === 'post') {
        return obj30(request, pathMatch, context);
    }
    return new RequestError(405, 'method not supported');
}
const obj31 = new RegExp('^\\/api\\/events\\/backup[\\/#\\?]?$', 'i');
function obj33(request, pathMatch, context) {
    request.params = {};
    if (request.body !== undefined) {
        return new RequestError(400, 'body is not allowed');
    }
    return request;
}
function obj32(request, pathMatch, context) {
    if (request.method === 'post') {
        return obj33(request, pathMatch, context);
    }
    return new RequestError(405, 'method not supported');
}
const obj34 = new RegExp('^\\/api\\/events\\/restore[\\/#\\?]?$', 'i');
function obj36(path, value, context) {
    if (value !== 'admin' && value !== 'user') {
        return new ValidationError(path, 'expected one of the enum value');
    }
    return value;
}
function obj35(path, value, context) {
    if (typeof value !== 'object' || value === null) {
        return new ValidationError(path, 'expected an object');
    }
    const keys = new Set(Object.keys(value));
    const value0 = value['name'];
    if (value0 !== undefined) {
        const result0 = obj11([
            ...path,
            'name'
        ], value0, context);
        if (result0 instanceof ValidationError) {
            return result0;
        }
        value['name'] = result0;
        keys.delete('name');
    } else {
        return new ValidationError(path, 'expected "name" to be defined');
    }
    const value1 = value['role'];
    if (value1 !== undefined) {
        const result1 = obj36([
            ...path,
            'role'
        ], value1, context);
        if (result1 instanceof ValidationError) {
            return result1;
        }
        value['role'] = result1;
        keys.delete('role');
    } else {
        return new ValidationError(path, 'expected "role" to be defined');
    }
    const value2 = value['color'];
    if (value2 !== undefined) {
        const result2 = obj11([
            ...path,
            'color'
        ], value2, context);
        if (result2 instanceof ValidationError) {
            return result2;
        }
        value['color'] = result2;
        keys.delete('color');
    }
    const value3 = value['googleId'];
    if (value3 !== undefined) {
        const result3 = obj11([
            ...path,
            'googleId'
        ], value3, context);
        if (result3 instanceof ValidationError) {
            return result3;
        }
        value['googleId'] = result3;
        keys.delete('googleId');
    }
    return value;
}
