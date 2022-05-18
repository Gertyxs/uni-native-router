import { deepClone, isString, isObject } from './utils'
import { parseQuery, stringifyQuery } from './query'
import { CreateOptions, RouteParams, RouteTypeParams, BackParams, MatchRouteParams, Route, Router, BeforeEach, AfterEach, RouteMeta } from './types'
export * from './types'

export let router: Router

/**
 * 创建路由
 * options 创建路由配置
 * @returns {Router}
 */
export const createRouter = (options: CreateOptions) => {
  const routes = options.routes || []
  const routeMethods = options.routeMethods ? options.routeMethods : ['navigateTo', 'switchTab', 'reLaunch', 'redirectTo', 'navigateBack']
  const routeMeta: RouteMeta = { to: null, from: null } // 路由元信息
  const beforeEach: BeforeEach[] = [] // 路由跳转前的拦截方法
  const afterEach: AfterEach[] = [] // 路由跳转后的拦截方法
  let routing = false // 标记路由状态 防止连点

  /**
   * 运行带有拦截功能的函数队列
   * @param fnList
   * @param to
   * @param from
   * @returns {Promise<*>}
   */
  const callWithNext = (fnList: any, to: Route | null, from: Route | null) => {
    const allWithNext = fnList.map((fn: any) => {
      return new Promise((resolve) => {
        fn(to, from, resolve)
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
  const callWithoutNext = (fnList: any, to: Route | null, from: Route | null) => {
    if (fnList && fnList.length > 0) {
      fnList.forEach((fn: any) => {
        fn(to, from)
      })
    }
  }

  /**
   * 匹配路由可以通过name或者path匹配
   * @returns {Route}
   */
  const matchRoute = ({ path, name, query }: MatchRouteParams) => {
    const route: Route = Object.create(null)
    route.query = {}
    if (path) {
      route.fullPath = path
      const pairs = path.split('?')
      path = pairs[0]
      if (pairs.length >= 2) {
        route.query = parseQuery(pairs[1])
      }
    }
    if (query) {
      route.query = { ...route.query, ...query }
    }
    let targetRoute = routes.find((r: Route) => {
      // 如果是首页 直接返回第一个路由配置
      if (path === '/') {
        return true
      }
      if (name) {
        return r.name === name
      }
      return r.path === path!.replace(/^\//, '')
    })
    if (targetRoute) {
      return { ...deepClone(targetRoute), ...route }
    } else {
      // 如果匹配不到对应的路由 尝试匹配 404 页面 name 为 notfound 不限大小写
      targetRoute = routes.find((r: Route) => r.name && r.name.toLowerCase() === 'notfound')
      if (targetRoute) {
        return { ...deepClone(targetRoute), ...route }
      }
    }
    return null
  }

  /**
   * 获取跳转路由需要的参数
   * @param params 路由参数
   * @returns {void}
   */
  const getRoueParams = (params: RouteTypeParams | string) => {
    let result: RouteTypeParams = { type: 'navigateTo' }
    if (isString(params)) {
      result.path = params as string
    }
    if (isObject(params)) {
      params = params as RouteTypeParams
      // 兼容 url 和 path写法
      if (params.url && !params.path) {
        params.path = params.url
      }
      result = { ...result, ...params }
    }
    return result
  }

  /**
   * 检测路有效性
   * @param params 路由参数
   * @returns {RouteTypeParams}
   */
  const checkRouteValid = (params: RouteTypeParams) => {
    // eslint-disable-next-line prefer-const
    let { path, name, query, type } = params
    if (routing) {
      throw new Error('路由进行中')
    }
    if (type && !routeMethods.includes(type)) {
      throw new Error(`type必须是以下的值${routeMethods}`)
    }

    routing = true

    // 返回操作比较特别
    if (type === 'navigateBack') {
      const { delta = 1 } = params
      const stackRoutes = getCurrentPages() // 当前已经入栈的路由
      if (stackRoutes.length >= 1) {
        const to = stackRoutes.length - delta >= 0 ? stackRoutes[stackRoutes.length - delta] : stackRoutes[0]
        path = isString(to.route) ? to.route : (to as any).$page.route // 防止页面中使用setup语法中带有route变量会覆盖getCurrentPages值中的route值
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
   * 调用下一步
   * @returns {Promise<*>}
   */
  const next = () => {
    const stackRoutes = getCurrentPages() // 当前已经入栈的路由
    if (stackRoutes.length > 0) {
      const from = stackRoutes[stackRoutes.length - 1] // 上一个路由
      const path = isString(from.route) ? from.route : (from as any).$page.route // 防止页面中使用setup语法中带有route变量会覆盖getCurrentPages值中的route值
      routeMeta.from = matchRoute({ path })
    } else {
      // 如果没有历史记录 取第一个作为from
      if (routes.length > 0) {
        routeMeta.from = deepClone(routes[0])
        routeMeta.from!.fullPath = routeMeta.from!.path
        routeMeta.from!.query = {}
      }
    }
    if (beforeEach && beforeEach.length > 0) {
      return callWithNext(beforeEach, routeMeta.to, routeMeta.from)
    } else {
      return Promise.resolve()
    }
  }

  /**
   * 路由跳转内部方法
   * @param type
   * @returns {void}
   */
  const routeTo = (type: string) => {
    return new Promise((resolve, reject) => {
      const jump = (uni as any)[type]
      const queryStr = stringifyQuery(routeMeta.to!.query)
      let url = `/${routeMeta.to!.path}`
      if (queryStr) {
        url += `?${queryStr}`
      }
      jump({
        url: url,
        success: resolve,
        fail: reject
      })
    })
  }

  /**
   * 路由跳转方法
   * @param params
   * @returns {Promise<*>}
   */
  const push = (params: RouteTypeParams | string) => {
    return new Promise((resolve: any, reject: any) => {
      params = getRoueParams(params)
      const { type } = params
      try {
        // 检测路由有效性
        checkRouteValid(params)
        // 符合要求下一步
        next().then(() => {
          routing = false
          routeTo(type).then(() => {
            resolve()
            callWithoutNext(afterEach, routeMeta.to, routeMeta.from)
          })
        })
      } catch (error) {
        routing = false
        reject(error)
      }
    })
  }

  /** 监听页面加载和 使用history方法跳转事件 */
  if (window && window.addEventListener) {
    const historyChange = () => {
      const path = window.location.hash.replace(/^#/, '')
      try {
        checkRouteValid({ path, type: 'redirectTo' })
        // 符合要求下一步
        next().then(() => {
          routing = false
          callWithoutNext(afterEach, routeMeta.to, routeMeta.from)
        })
      } catch (error) {
        routing = false
        console.error(error)
      }
    }
    window.addEventListener('popstate', historyChange)
    window.addEventListener('DOMContentLoaded', historyChange)
  }

  router = {
    push,
    navigateTo(params: RouteParams) {
      return push({ ...params, type: 'navigateTo' })
    },
    switchTab(params: RouteParams) {
      return push({ ...params, type: 'switchTab' })
    },
    reLaunch(params: RouteParams) {
      return push({ ...params, type: 'reLaunch' })
    },
    redirectTo(params: RouteParams) {
      return push({ ...params, type: 'redirectTo' })
    },
    navigateBack(params?: BackParams) {
      return push({ ...params, type: 'navigateBack' })
    },
    beforeEach(fn: BeforeEach) {
      beforeEach.push(fn)
    },
    afterEach(fn: AfterEach) {
      afterEach.push(fn)
    },
    routeMeta
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
  if (router.routeMeta.to) {
    return router.routeMeta.to
  } else {
    return { query: {}, path: '' }
  }
}
