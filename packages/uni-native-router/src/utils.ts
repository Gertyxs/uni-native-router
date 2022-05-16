/**
 * 是否是对象
 * @param data
 * @returns Boolean
 */
export const isObject = (data: any) => {
  return Object.prototype.toString.call(data).includes('Object')
}

/**
 * 是否是数组
 * @param data
 * @returns Boolean
 */
export const isArray = (data: any) => {
  return Object.prototype.toString.call(data).includes('Array')
}

/**
 * 是否是字符串
 * @param data
 * @returns Boolean
 */
export const isString = (data: any) => {
  return Object.prototype.toString.call(data).includes('String')
}

/**
 * 是否是函数
 * @param data
 * @returns Boolean
 */
export const isFunction = (data: any) => {
  return Object.prototype.toString.call(data).includes('Function')
}

/**
 * 深拷贝
 * @param data
 * @returns
 */
export const deepClone = (data: any) => {
  if (typeof data !== 'object') return null
  return JSON.parse(JSON.stringify(data))
}
