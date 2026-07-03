<template>
  <div class="left">
    <div class="nav-menu">
      <div class="menu-item" v-for="item in data" :key="item.title" @click="setActive(item)">
        <el-button :class="{ 'active-icon': active == item.title, 'normal-icon': active != item.title }" link
          :icon="item.icon" :title="item.title" />
        <span :class="{ 'active-text': active == item.title }">{{ item.title }}</span>
      </div>
    </div>

    <div class="content-panel">
      <div class="search-box">
        <el-input v-model="searchText" placeholder="搜索..." clearable size="small" />
      </div>
      <div class="build">
        <div class="back" v-for="i in filteredList">
          <div class="item" draggable="true" @dragend="e => dragAdd(e, i)">
            <el-link @click="clickLeft(i)">
              {{ i.split('/').pop() }}
            </el-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ThreeEditor, getObjectViews, createGsapAnimation } from './lib'
import * as THREE from 'three';

const editor_components = ThreeEditor.__DESIGNS__.map(v => v.label)

const loadingDiv = document.createElement('div')
Object.assign(loadingDiv.style, {
  pointerEvents: 'none',
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%,-50%)',
  color: 'white',
  fontSize: '20px',
  backgroundColor: 'rgba(0,0,0,0.5)',
  padding: '10px 20px',
  borderRadius: '5px'
})

const listJ = window.editorJsons
const lightTypes = ['环境光', '平行光', '点光源', '聚光灯', '半球光', '平面光'];
const data = [
  {
    icon: 'set-up',
    title: '配置案例',
    list: listJ
  },
  {
    icon: 'office-building',
    title: '模型',
    list: window.models,
  },
  {
    title: '灯光',
    icon: 'sunny',
    list: lightTypes
  },
  {
    title: '组件',
    icon: 'connection',
    list: editor_components
  }
];

const activeLocal = localStorage.getItem('new_active')
const showList = ref(data.find(v => v.title === activeLocal)?.list || data[0].list);
const active = ref(activeLocal || data[0].title);
const searchText = ref('');

const filteredList = computed(() => {
  if (!searchText.value) return showList.value;
  return showList.value.filter(item =>
    item.split('/').pop().toLowerCase().includes(searchText.value.toLowerCase())
  );
});

function setActive(item) {
  localStorage.setItem('new_active', item.title);
  active.value = item.title;
  showList.value = item.list;
  searchText.value = '';
}

const loadScene = (v) => fetch(v).then(res => res.json()).then(res => threeEditor?.resetEditorStorage(res))
const loadModel = (url, point) => {
  const { modelCores } = window.threeEditor
  const { camera, controls, transformControls } = threeEditor
  const { loaderService } = modelCores.loadModel(url)
  document.body.appendChild(loadingDiv)
  loaderService.progress = progress => loadingDiv.innerText = '下载' + (progress * 100).toFixed(2) + '%'
  loaderService.complete = model => {
    if(point) model.position.copy(point)
    document.body.removeChild(loadingDiv)
    const { maxView, target } = getObjectViews(model)
    Promise.all([createGsapAnimation(camera.position, maxView, { duration: 0.3 }), createGsapAnimation(controls.target, target, { duration: 0.3 })]).then(() => {
      transformControls.attach(model)
    })
  }
}
window.left_loadModel = loadModel
async function clickLeft(v, point) {
  if (active.value === '配置案例') {
    window.currentOnlineSceneName = v.split('/').pop().replace('.json', '')
    loadScene(v)
  }
  else if (active.value === '模型') loadModel(v, point)
  else if (active.value === '组件') {
    const { scene, transformControls } = threeEditor
    const design = ThreeEditor.__DESIGNS__.find(d => d.label === v)
    const mesh = await design.create(null, threeEditor, threeEditor)
    if (!mesh) return
    mesh.editorType = 'isDesignMesh'
    mesh.designType = design.name
    scene.add(mesh)
    if (point) mesh.position.copy(point)
    const { maxView, target } = getObjectViews(mesh)
    //检测是否存在maxView
    if(maxView.x){
      createGsapAnimation(threeEditor.camera.position, maxView, { duration: 0.3 })
      createGsapAnimation(threeEditor.controls.target, target, { duration: 0.3 })
    }
    transformControls.attach(mesh)
  }
  else if (active.value === '灯光') {
    const { scene, transformControls } = threeEditor
    const lightMap = {
      '环境光': () => new THREE.AmbientLight(0xffffff, 1),
      '平行光': () => new THREE.DirectionalLight(0xffffff, 1),
      '点光源': () => new THREE.PointLight(0xffffff, 1, 0, 0),
      '聚光灯': () => new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 6, 0, 0),
      '半球光': () => new THREE.HemisphereLight(0xffffff, 0x000000, 1),
      '平面光': () => new THREE.RectAreaLight(0xffffff, 1, 100, 100),
    }
    const light = lightMap[v]()
    if (light.target) scene.add(light.target)
    light.editorType = 'isLight'
    light.name = v
    if (point) light.position.copy(point)
    scene.add(light)
    transformControls.attach(light)
  }
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragAdd = (e, v) => {
  e.preventDefault();
  const { dataTransfer } = e;
  const { clientX, clientY } = e;
  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, threeEditor.camera);
  const intersects = raycaster.intersectObjects(threeEditor.scene.children, true);
  if (intersects.length > 0) {
    const intersect = intersects[0];
    const { point } = intersect;
    clickLeft(v, point)
  }
}

</script>

<style lang="less" scoped>
.left {
  width: 280px;
  height: calc(100% - 50px);
  background-color: #181818;
  position: fixed;
  top: 50px;
  left: 0;
  z-index: 100;
  display: flex;
}

.nav-menu {
  width: 60px;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #4a4a4a;
  box-sizing: border-box;
}

.menu-item {
  height: 62px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  cursor: pointer;
  border-bottom: 1px solid #3e3e3e;
  user-select: none;
  transition: all 0.2s ease;

  &:hover {
    background-color: #252525;
  }

  .normal-icon {
    font-size: 24px;
    transition: all 0.2s;
  }

  .active-icon {
    font-size: 28px;
    color: rgb(182, 211, 244);
    font-weight: 800;
    transition: all 0.2s;
  }

  .active-text {
    color: rgb(182, 211, 244);
    font-weight: bold;
  }
}

.content-panel {
  flex: 1;
  height: calc(100% - 40px);
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.search-box {
  padding: 10px;
  border-bottom: 1px solid #3e3e3e;
  background-color: #1e1e1e;
}

.build {
  padding: 4px;
  box-sizing: border-box;
  display: grid;
  grid-auto-rows: 80px;
  grid-template-columns: repeat(2, 1fr);
  overflow: scroll;
  height: 100%;
  justify-items: center;
  width: 100%;

  .back {
    height: 70px;
    width: 90px;
    border-radius: 6px;
    border: 1px solid #676768;
    display: flex;
    padding: 5px;
    box-sizing: border-box;
  }

  .item {
    border: 1px solid #3d3d3d;
    border-radius: 3px;
    height: 100%;
    width: 100%;
    word-wrap: break-word;
    word-break: break-all;
    font-size: 12px;
    display: flex;
    overflow-wrap: break-word;
    text-align: center;
    justify-content: center;
    align-content: center;
    justify-items: center;
    align-items: center;
    padding: 4px;  box-sizing: border-box;
  }

}
</style>
