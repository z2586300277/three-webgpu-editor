// export * from '../../../Vite_three-editor/lib/main'
// export * from '../../../Vite_three-editor/dist/index'

import { ThreeEditor } from 'three-webgpu-editor'

ThreeEditor.dracoPath = __isProduction__ ? '/threejs-editor/draco/' : '/draco/'

ThreeEditor.__DESIGNS__.unshift(...Object.values(import.meta.glob('./compoents/\*.js', { eager: true, import: 'default' }))) 

export * from 'three-webgpu-editor'