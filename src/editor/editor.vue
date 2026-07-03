<template>
    <div class="edit" ref="editor" @dragover.prevent @drop.prevent> </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import tamplateJson from './template.json'
import { ThreeEditor } from './lib'

let threeEditor = null
const editor = ref(null)
window.GUI_PARAMS = {
    step: 0.1,
}

const { dataCores } = defineProps(['dataCores'])
const emits = defineEmits(['emitThreeEditor'])

watch(() => dataCores.sceneName, (val) => {

    let params = localStorage.getItem(val + '-webgpuEditor')
    params = JSON.parse(params) || tamplateJson
    
    try {
        threeEditor.resetEditorStorage(changeDBModelUrl(params))
    } catch (error) {
        localStorage.removeItem(val + '-webgpuEditor')
    }

})

async function init() {


    try {
        
        let sceneParams = JSON.parse(localStorage.getItem(dataCores.sceneName + '-webgpuEditor')) || tamplateJson
        if (window.editorPreviewSceneUrl) {
            try {
                const res = await fetch(window.editorPreviewSceneUrl).then(res => res.json())
                if(res) sceneParams = res
            } catch (error) {}
        }

        let logarithmicDepthBuffer = true
        if (localStorage.getItem('webgpuEditor_logBuffer') === 'false') logarithmicDepthBuffer = false
        let pixelRatioMulti = 1
        if (localStorage.getItem('webgpuEditor_pixelRatio')) pixelRatioMulti = parseFloat(localStorage.getItem('webgpuEditor_pixelRatio'))
        threeEditor = new ThreeEditor(editor.value, {
            fps: null,
            pixelRatio: window.devicePixelRatio * pixelRatioMulti,
            webglRenderParams: { antialias: true, alpha: true, logarithmicDepthBuffer },
            sceneParams: changeDBModelUrl(sceneParams)
        })
    } catch (error) {
        localStorage.removeItem(dataCores.sceneName + '-webgpuEditor')
    }



    emits('emitThreeEditor', threeEditor)
    window.addEventListener('resize', () => window.threeEditor?.renderSceneResize?.())

}

function changeDBModelUrl(sceneParams) {
    sceneParams?.modelCores?.forEach(i => {
        if (i.modelInfo.threeEditorDBNameUrl) {
            const [_, name] = i.modelInfo.threeEditorDBNameUrl.split(':')
            const item = window.threeEditorDB.list.find(i => i.name === name)
            if (item) i.modelInfo.url = URL.createObjectURL(item.blob)
            else sceneParams.modelCores.splice(sceneParams.modelCores.indexOf(i), 1)
        }
    })
    return sceneParams
}

onMounted(() => init())
onUnmounted(() => threeEditor?.destroySceneRender());

</script>

<style scoped>
.edit {
    width: 100vw;
    height: 100vh;
}
</style>