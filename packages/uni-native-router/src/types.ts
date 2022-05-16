/**
 * Query 参数
 */
export interface Query {
  [key: string]: any
}

/**
 * 路由类型定义
 */
export interface Route {
  path: string
  name?: string
  fullPath?: string
  query: Query
  [key: string]: any
}

/**
 * 初始化路由Options
 */
export interface CreateOptions {
  routes: Route[] // 路由配置
  routeMethods?: string[] // 路由具有的方法
}

/**
 * 初始化路由Options
 */
export interface MatchRouteParams {
  path?: string
  name?: string
  query?: Query
}

/**
 * 下一步回调函数
 */
export type Next = (value: unknown) => void

/**
 * 路由跳转前拦截函数
 */
export type BeforeEach = (to: Route | null, from: Route | null, next: Next) => void

/**
 * 路由跳转后拦截函数
 */
export type AfterEach = (to: Route | null, from: Route | null) => void

/**
 * 路由实例
 */
export interface RouteParams {
  path?: string
  name?: string
  query?: Query
  [key: string]: any
}

/**
 * 路由实例
 */
export interface RouteTypeParams extends RouteParams {
  type: string
  [key: string]: any
}

/**
 * 返回参数
 */
export interface BackParams {
  delta?: number // 返回的页面数
  [key: string]: any
}

/**
 * 路由元数据
 */
export interface RouteMeta {
  delta?: number // 返回的页面数
  [key: string]: any
}

/**
 * 路由实例
 */
export interface Router {
  push: (params: RouteTypeParams) => void
  navigateTo: (params: RouteParams) => void
  switchTab: (params: RouteParams) => void
  reLaunch: (params: RouteParams) => void
  redirectTo: (params: RouteParams) => void
  navigateBack: (params?: BackParams) => void
  beforeEach?: (beforeEach: BeforeEach) => void
  afterEach?: (afterEach: AfterEach) => void
  routeMeta: RouteMeta
}

/**
 * global
 */
declare global {
  let uni: any
  let getCurrentPages: () => any
}
