const path = require('path')
const fs = require('fs')
const cwdPath = process.cwd()

/**
 * 解析绝对路径
 * @param _path
 * @returns
 */
const resolvePath = (_path) => {
  return path.resolve(cwdPath, _path)
}

/**
 * 读取pages.json 路由配置文件
 */
const readPages = (options) => {
  options = options ? options : {}
  const input = options.input ? options.input : resolvePath('./src/pages.json') // pages.json路径
  const output = options.output ? options.output : resolvePath('./src/pages.js') // 输出路径
  const includes = options.includes ? options.includes : null // 需要获取包涵的字段 不输入包含所有
  const isCreate = options.isCreate ? options.isCreate : false // 是否生成文件
  const buffPrefix = Buffer.from('export default ') // 如果需要生成路由文件的导出语句
  let config: any = {} // 存储路由数据的对象

  // 同步读取文件
  const fileData = fs.readFileSync(input)

  // 解析存在异常的json数据 诸如 单引号、注释等
  config = new Function(`return ${fileData.toString()}`)()

  // 获取指定字段路由对象
  const getAssignFieldRoutes = (routes) => {
    return routes.map((page) => {
      const item = {}
      if (!includes) {
        return page
      }
      for (const key in page) {
        if (includes.includes(key) && page[key]) {
          item[key] = page[key]
        }
      }
      return item
    })
  }

  // 遍历，读取指定的字段，减小文件体积
  config.pages = getAssignFieldRoutes(config.pages)

  // 如果有分包
  if (config.subPackages) {
    config.subPackages = getAssignFieldRoutes(config.subPackages)
  }

  // 合并路由和子路由
  if (config.subPackages) {
    config.routes = [...config.pages, config.subPackages]
  } else {
    config.routes = [...config.pages]
  }

  // 如果要生成路由文件
  if (isCreate) {
    fs.writeFileSync(output, `${buffPrefix}${Buffer.from(JSON.stringify(config.routes))}`)
  }

  return config
}

export default readPages
