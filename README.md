# uni-native-router

[![](https://img.shields.io/badge/npm-v1.1.3-blue)](https://github.com/Gertyxs/uni-native-router)

> 一个使用 typescript 封装 uniapp 原生路由 API 库，使用 uni-app 原生钩子实现和方法实现、hooks 的使用方式适配 vue3

## 介绍

1. 使用 uniapp 原生 api 封装，破坏性小，易于移植，使用上和原生差异小
2. 使用 Typescript 封装
3. 由于基于原生 API 封装，全平台兼容
4. 适配 vue3，可以使用类似[Composition API](https://v3.cn.vuejs.org/api/composition-api.html)开发
5. 封装了路由守卫功能
6. 可配置 404 页面拦截

## 安装

```shell
npm install --save uni-native-router
# or
yarn add uni-native-router
```

## 用法

> 创建 router.ts

```js
import { createRouter } from 'uni-native-router'
export { useRoute, useRouter } from 'uni-native-router' // 导出适配vue3的hooks获取路由钩子方法
import pages from '@/pages.json' // 导入路由配置文件

// 创建路由对象
export let router = createRouter({ routes: pages.pages })

// 设置路由器
export function setupRouter(app: any) {
  // 路由请求前拦截
  router.beforeEach(async (to: any, from: any, next: any) => {
    next()
  })
  // 路由请求后拦截
  router.afterEach((to: any, from: any) => {
    // 逻辑代码
  })

  return router
}
```

#### 注意

创建路由对象的时候需要传入路由配置对象（即 pages.json 里面的配置）

如果使用[vite](https://cn.vitejs.dev/guide/)构建，可以直接使用`import pages from '@/pages.json'`导入得到对应对象

如果使用[webpack](https://webpack.js.org/)构建在打包的时候可能会拿不到路由对象，在此，编写了读取 pages.json 的工具，可参考[read-pages](https://github.com/Gertyxs/uni-native-router/tree/master/packages/read-pages)

> 在 main.ts 入口文件注册

```js
import { createSSRApp } from 'vue'
import App from '@/App.vue'
import { setupRouter } from './router'

export function createApp() {
  const app = createSSRApp(App)

  // 初始化路由
  setupRouter(app)

  return {
    app
  }
}
```

> 在组件或页面里面使用

```html
<template>
  <view class="uni-native-router">
    <view class="jump-btn" @click="jump">路由跳转</view>
  </view>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { useRoute, useRouter } from '@/router'

  // state
  const _route = useRoute() // 获取路由元对象
  const router = useRouter() // 获取路由对象
  console.log(_route.query) // 路由参数 类似在 onLoad 里面的 options

  // 路由跳转
  const jump = () => {
    router.navigateTo({ url: 'pages/mine/index', query: { entry: 'mine' } })
  }
</script>
```

## 配置 404 页面

> 如果在`pages.json`里面找不到对应的路由会尝试找到`pages.json`里面的`name`为`notfound`的页面不限大小写

```json
{
  "path": "pages/not-found/index",
  "name": "notfound",
  "style": {
    "navigationBarTitleText": "NotFound"
  }
}
```

## 创建路由对象

### createRouter(CreateOptions)

此方法为创建路由对象，返回路由对象`router`

```typescript
CreateOptions {
  routes: Route[] // 路由配置
  routeMethods?: string[] // 路由具有的方法
}
```

## API

### router.navigateTo(OBJECT)

此方法返回一个`Promise`对象

OBJECT 参数同[uniapp](https://uniapp.dcloud.net.cn/api/router.html#navigateto)

增加`query`参数对象，便于传参数，同时也兼容`'path?key=value&key2=value2'`写法

### router.redirectTo(OBJECT)

此方法返回一个`Promise`对象

OBJECT 参数同[uniapp](https://uniapp.dcloud.net.cn/api/router.html#redirectTo)

增加`query`参数对象，便于传参数，同时也兼容`'path?key=value&key2=value2'`写法

### router.relaunch(OBJECT)

此方法返回一个`Promise`对象

OBJECT 参数同[uniapp](https://uniapp.dcloud.net.cn/api/router.html#relaunch)

增加`query`参数对象，便于传参数，同时也兼容`'path?key=value&key2=value2'`写法

### router.switchtab(OBJECT)

此方法返回一个`Promise`对象

OBJECT 参数同[uniapp](https://uniapp.dcloud.net.cn/api/router.html#switchtab)

### router.navigateBack(OBJECT)

此方法返回一个`Promise`对象

OBJECT 参数同[uniapp](https://uniapp.dcloud.net.cn/api/router.html#navigateBack)

### router.beforeEach(cb)

路由前置守卫

`cb`守卫回调函数会传`to、 from、 next` 参数进去，完成操作必须要调用`next`方法执行下一步

### router.afterEach(cb)

路由后置守卫

`cb`守卫回调函数会传`to、 from 参数进去

## License

[MIT](https://github.com/Gertyxs/vite-plugin-stylelint-serve/blob/master/LICENSE)
