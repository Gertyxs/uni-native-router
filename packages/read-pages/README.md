# read-pages

> 读取 uni-app 配置文件 pages.json 的工具包

### vite 里面配置

建议直接使用`import pages from '@/pages.json'`导入

`vite.config.ts`

```js
import path from 'path'
import { UserConfigExport, ConfigEnv, loadEnv } from 'vite'
import eslintPlugin from 'vite-plugin-eslint'
import uni from '@dcloudio/vite-plugin-uni'

// 读取pages.json
import readPages from 'uni-native-router/dist/read-pages'
const pages = readPages({ input: './src/pages.json' })

export default ({ command, mode }: ConfigEnv): UserConfigExport => {
  const envConf = loadEnv(mode, root)
  return {
    root: root,
    plugins: [
      uni()
    ],
    define: {
      ROUTES: JSON.stringify(pages.pages)
    }
  }
}

```

> 在项目中拿到routes路由配置

```js
import { createRouter } from 'uni-native-router'
export { useRoute, useRouter } from 'uni-native-router' // 导出适配vue3的hooks获取路由钩子方法

// 创建路由对象
export let router = createRouter({ routes: ROUTES }) // ROUTES对应的是vite define配置里面的ROUTES

// 设置路由器
export function setupRouter(app: any) {
  // ...
  return router
}
```



### webpack 里面使用

```js
import webpack from 'webpack'
// 读取pages.json
import readPages from 'uni-native-router/dist/read-pages'
const pages = readPages({ input: './src/pages.json' })

module.exports = {
	configureWebpack: {
		plugins: [
			new webpack.DefinePlugin({
				ROUTES: webpack.DefinePlugin.runtimeValue(() => {
					return JSON.stringify(pages.pages)
				}, true)
			})
		]
	}
}
```

> 在项目中拿到routes路由配置

```js
import { createRouter } from 'uni-native-router'
export { useRoute, useRouter } from 'uni-native-router' // 导出适配vue3的hooks获取路由钩子方法

// 创建路由对象
export let router = createRouter({ routes: ROUTES }) // ROUTES对应的是vite define配置里面的ROUTES

// 设置路由器
export function setupRouter(app: any) {
  // ...
  return router
}
```

### 

## API

### readPages(OBJECT)

`OBJECT.input `读取文件路径，默认为`./src/pages.json`

`OBJECT.output `输出路径`isCreate:true`时生效，默认为`./src/pages.js`

`OBJECT.includes `需要获取包涵的字段，不输入包含所有

`OBJECT.isCreate` 是否生成文件，默认为`false`