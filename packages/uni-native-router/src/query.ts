import { Query } from './types'

/**
 * 解析query
 * @param query
 * @returns {Object}
 */
export const parseQuery = (query: string) => {
  const result: Query = {}
  // 如果不是字符串返回空对象
  if (typeof query !== 'string') {
    return result
  }

  // 去掉字符串开头可能带的?
  if (query.charAt(0) === '?') {
    query = query.substring(1)
  }

  const pairs = query.split('&')

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split('=')
    // application/x-www-form-urlencoded编码会将' '转换为+
    const key = decodeURIComponent(pair[0]).replace(/\+/g, ' ')
    const value = decodeURIComponent(pair[1]).replace(/\+/g, ' ')
    // 如果是新key，直接添加
    if (!(key in result)) {
      result[key] = value
    } else if (Array.isArray(result[key])) {
      // 如果key已经出现一次以上，直接向数组添加value
      result[key].push(value)
    } else {
      // key第二次出现，将结果改为数组
      const valueArr = [result[key]]
      valueArr.push(value)
      result[key] = valueArr
    }
  }
  return result
}

/**
 * 将对象分隔成 queryStr字符串
 * @param queryRaw 需要格式化的数据对象
 * @returns {String}
 */
export const stringifyQuery = (queryRaw: Query) => {
  let search = ''
  for (let key in queryRaw) {
    const value = queryRaw[key]
    key = encodeURIComponent(key)
    if (value == null) {
      if (value !== undefined) {
        search += (search.length ? '&' : '') + key
      }
      continue
    }
    const values: string[] = Array.isArray(value) ? value.map((v) => v && encodeURIComponent(v)) : [value && encodeURIComponent(value)]
    values.forEach((value) => {
      if (value !== undefined) {
        search += (search.length ? '&' : '') + key
        if (value != null) search += '=' + value
      }
    })
  }
  return search
}
