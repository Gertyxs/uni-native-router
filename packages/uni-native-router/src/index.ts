import { deepClone, isString, isObject } from './utils'
import { parseQuery, stringifyQuery } from './query'
import { CreateOptions, BackParams, Route, Router, BeforeEach, AfterEach, RouteMeta } from './types'
export let router: Router

/**
 * 创建路由
 * @param options 创建路由配置
 * @returns {Router}
 */
export const createRouter = (options: CreateOptions) => {
  const pagesRoutes = options.routes || []
  let subPackagesRoutes = [] as Route[]
  options.subPackages?.length !== 0 &&
    options.subPackages?.map((pkg) => {
      const pages = pkg.pages.map((page: Route) => Object.assign({}, page, { path: `${pkg.root}/${page.path}` }))
      subPackagesRoutes = subPackagesRoutes.concat(pages)
    })
  const routes = pagesRoutes.concat(subPackagesRoutes)
  const routeMethods = options.routeMethods ? options.routeMethods : ['navigateTo', 'switchTab', 'reLaunch', 'redirectTo', 'navigateBack']
  const routeMeta: RouteMeta = { to: {}, from: {} } // 路由元信息
  const beforeEach: BeforeEach[] = [] // 路由跳转前的拦截方法
  const afterEach: AfterEach[] = [] // 路由跳转后的拦截方法
  let isLaunch = false // 程序是否已经运行了
  let isOperateAPI = false // 是否操作API跳转

  /**
   * 获取当前页面
   * @returns 当前页面
   */
  const getCurrentPage = () => {
    const pages = getCurrentPages()
    return pages.length > 0 ? pages[pages.length - 1] : undefined
  }

  /**
   * 获取页面路径
   * @param page
   */
  const getPagePath = (page: any | undefined) => {
    page = page || {}
    return isString(page.route) ? page.route : (page as any).$page.route
  }

  /**
   * 运行带有拦截功能的函数队列
   * @param fnList
   * @param to
   * @param from
   * @returns {Promise<*>}
   */
  const callWithNext = (fnList: any, to: Route, from: Route) => {
    const allWithNext = fnList.map((fn: any) => {
      return new Promise((resolve, reject) => {
        fn(to, from, (value?: Route | boolean | string) => {
          if (typeof value === 'undefined') {
            return resolve(true)
          }
          if (typeof value === 'boolean') {
            if (value) return resolve(true)
            if (!value) return reject('路由跳转失败')
          }
          if (isObject(value)) {
            return resolve({ type: 'navigateTo', ...(value as Route) })
          }
          if (isString(value)) {
            return resolve({ path: value as string, type: 'navigateTo' })
          }
          reject(false)
        })
      })
    })
    return Promise.all(allWithNext)
  }

  /**
   * 运行带有拦截功能的函数队列
   * @param fnList
   * @param to
   * @param from
   * @returns {void}
   */
  const callWithoutNext = (fnList: any, to: Route, from: Route) => {
    if (fnList && fnList.length > 0) {
      fnList.forEach((fn: any) => {
        fn(to, from)
      })
    }
  }

  /**
   * 匹配路由可以通过name或者path匹配
   * @param route
   * @returns {Route}
   */
  const matchRoute = (route: Route) => {
    // eslint-disable-next-line prefer-const
    let { path, name, query } = route
    const _route: Route = Object.create(null)
    _route.query = {}
    if (path) {
      _route.fullPath = path
      const pairs = path.split('?')
      path = pairs[0]
      if (pairs.length >= 2) {
        _route.query = parseQuery(pairs[1])
      }
    }
    if (query) {
      _route.query = { ..._route.query, ...query }
    }
    let targetRoute = routes.find((r: Route) => {
      // 如果是首页 直接返回第一个路由配置
      if (path === '/' || path === '') {
        return true
      }
      if (name) {
        return r.name === name
      }
      return r.path === path!.replace(/^\//, '')
    })
    if (targetRoute) {
      return { ...deepClone(targetRoute), ..._route }
    } else {
      // 如果匹配不到对应的路由 尝试匹配 404 页面 name 为 notfound 不限大小写
      targetRoute = routes.find((r: Route) => r.name && r.name.toLowerCase() === 'notfound')
      if (targetRoute) {
        return { ...deepClone(targetRoute), ..._route }
      }
    }
    return null
  }

  /**
   * 处理路由对象
   * @param route 路由参数
   * @returns {Route}
   */
  const handleRoute = (route: Route | string) => {
    let result: Route = { type: 'navigateTo' }
    if (isString(route)) {
      result.path = route as string
    }
    if (isObject(route)) {
      route = route as Route
      // 兼容 url 和 path写法
      if (route.url && !route.path) {
        route.path = route.url
      }
      result = { ...result, ...route }
    }
    return result
  }

  /**
   * 匹配to路由
   * @param route 路由参数
   * @returns {Route}
   */
  const matchToRoute = (route: Route) => {
    // eslint-disable-next-line prefer-const
    let { path, name, query, type } = route
    if (type && !routeMethods.includes(type)) {
      throw new Error(`type必须是以下的值${routeMethods}`)
    }
    // 返回操作比较特别
    if (type === 'navigateBack') {
      const { delta = 1 } = route
      const stackRoutes = getCurrentPages() // 当前已经入栈的路由
      if (stackRoutes.length >= 1) {
        const to = stackRoutes.length - 1 - delta >= 0 ? stackRoutes[stackRoutes.length - 1 - delta] : stackRoutes[0]
        path = getPagePath(to)
      }
    }
    // 如果 path 不是以 / 开头
    if (path && path.indexOf('/') !== 0) {
      path = '/' + path
    }
    // 匹配路由
    routeMeta.to = matchRoute({ path, name, query })
    if (!routeMeta.to) {
      throw new Error('找不到对应的路由配置')
    }
  }

  /**
   * 匹配from路由
   * @param route 路由参数
   * @returns {Route}
   */
  const matchFromRoute = () => {
    const stackRoutes = getCurrentPages() // 当前已经入栈的路由
    if (stackRoutes.length > 0) {
      const from = stackRoutes[stackRoutes.length - 1] // 上一个路由
      const path = getPagePath(from)
      routeMeta.from = matchRoute({ path })
    } else {
      // 如果没有历史记录 取第一个作为from
      if (routes.length > 0) {
        routeMeta.from = deepClone(routes[0])
        routeMeta.from!.fullPath = routeMeta.from!.path
        routeMeta.from!.query = {}
      }
    }
  }

  /**
   * 调用下一步
   * @returns {Promise<*>}
   */
  const next = () => {
    matchFromRoute()
    if (beforeEach && beforeEach.length > 0) {
      return callWithNext(beforeEach, routeMeta.to, routeMeta.from)
    } else {
      return Promise.resolve()
    }
  }

  /**
   * 路由跳转内部方法
   * @param route
   * @returns {void}
   */
  const routeTo = (route: Route) => {
    return new Promise((resolve: any, reject) => {
      if (route.isLaunch) {
        return resolve()
      }
      // const jump = (uni as any)[type] // 这种使用会被vite treeShaking 掉uni里面的方法
      // 为了方法不被 vite treeShaking掉，使用显式赋值
      // eslint-disable-next-line prefer-const
      let { type, url, ...reset } = route
      let jump: any = uni.navigateTo
      if (type === 'navigateTo') jump = uni.navigateTo
      if (type === 'switchTab') jump = uni.switchTab
      if (type === 'reLaunch') jump = uni.reLaunch
      if (type === 'redirectTo') jump = uni.redirectTo
      if (type === 'navigateBack') jump = uni.navigateBack
      const queryStr = stringifyQuery(routeMeta.to!.query)
      url = `/${routeMeta.to!.path}`
      if (queryStr) {
        url += `?${queryStr}`
      }
      jump({
        ...reset,
        url: url,
        success: resolve,
        fail: reject
      })
    })
  }

  /**
   * 路由跳转方法
   * @param route
   * @returns {Promise<*>}
   */
  const push = (route: Route | string) => {
    return new Promise((resolve: any, reject: any) => {
      route = handleRoute(route)
      try {
        // 匹配路由
        matchToRoute(route)
        // 符合要求下一步
        next().then((nextRes: any) => {
          nextRes = nextRes || []
          routeTo(route as Route).then(() => {
            resolve()
            callWithoutNext(afterEach, routeMeta.to, routeMeta.from)
            // 路由钩子是否存在重定向
            nextRes.forEach((r: Route) => {
              if (isObject(r)) {
                let _route = { type: 'navigateTo', ...(r as Route) } as Route
                _route = handleRoute(_route)
                matchToRoute(_route)
                isOperateAPI = true
                push(_route)
              }
            })
          })
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  router = {
    navigateTo(route: Route) {
      isOperateAPI = true
      return push({ ...route, type: 'navigateTo' })
    },
    switchTab(route: Route) {
      isOperateAPI = true
      return push({ ...route, type: 'switchTab' })
    },
    reLaunch(route: Route) {
      isOperateAPI = true
      return push({ ...route, type: 'reLaunch' })
    },
    redirectTo(route: Route) {
      isOperateAPI = true
      return push({ ...route, type: 'redirectTo' })
    },
    navigateBack(route?: BackParams) {
      isOperateAPI = true
      return push({ ...route, type: 'navigateBack' })
    },
    beforeEach(fn: BeforeEach) {
      beforeEach.push(fn)
    },
    afterEach(fn: AfterEach) {
      afterEach.push(fn)
    },
    routeMeta,
    install(app: any) {
      app.mixin({
        onLaunch(options: any) {
          router.routeMeta.to.query = options.query
        },
        onShow() {
          if (this.$mpType === 'page') {
            const page = getCurrentPage()
            const path = (page as any).$page.fullPath
            if (!isLaunch && !isOperateAPI) {
              push({ path, type: 'redirectTo', isLaunch: true }) // isLaunch 设置为允许，直接不跳转
            }
            if (isLaunch && !isOperateAPI && routeMeta.to.path !== path) {
              push({ path, type: 'redirectTo', isLaunch: true }) // isLaunch 设置为允许，直接不跳转
            }
            isLaunch = true
            isOperateAPI = false
          }
        }
      })
    }
  }
  return router
}

/**
 * 钩子函数 返回路由操作对象
 * @returns {Router}
 */
export const useRouter = (): Router => {
  if (!router) {
    throw new Error('路由还没初始化')
  }
  return router
}

/**
 * 钩子函数 返回当前路由对象
 * @returns {Route}
 */
export const useRoute = (): Route => {
  if (!router) {
    throw new Error('路由还没初始化')
  }
  if (router.routeMeta.to && Object.keys(router.routeMeta.to).length > 0) {
    return router.routeMeta.to
  } else {
    return { query: {}, path: '' }
  }
}
