<template>
  <div class="container mt-4">
    <h3>Programar Envío de Archivos a Grupos de WhatsApp</h3>

    <!-- Carga de archivos -->
    <div class="mb-3">
      <label class="form-label">Seleccionar Archivos</label>
      <input type="file" class="form-control" multiple @change="handleFiles" />
    </div>

    <!-- Selección de grupos -->
    <div class="mb-3">
      <label class="form-label">Seleccionar Grupos</label>
      <select multiple v-model="selectedGroups" class="form-select">
        <option v-for="group in groups" :key="group.id" :value="group.id">
          {{ group.name }}
        </option>
      </select>
    </div>

    <!-- Selección de horario -->
    <div class="mb-3">
      <label class="form-label">Fecha y Hora de Envío</label>
      <input type="datetime-local" class="form-control" v-model="scheduledTime" />
    </div>

    <!-- Enviar -->
    <button class="btn btn-primary" @click="submitSchedule">Programar Envío</button>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const selectedGroups = ref<string[]>([]);
const scheduledTime = ref<string>('');
const files = ref<File[]>([]);
const groups = ref<{ id: string; name: string }[]>([]);

const handleFiles = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    files.value = Array.from(target.files);
  }
};

const submitSchedule = async () => {
  if (!files.value.length || !scheduledTime.value || !selectedGroups.value.length) {
    alert('Por favor, completá todos los campos');
    return;
  }

  const formData = new FormData();
  files.value.forEach((file) => formData.append('files', file));
  formData.append('scheduledTime', scheduledTime.value);
  formData.append('groupIds', JSON.stringify(selectedGroups.value));

  try {
    await axios.post('http://localhost:3000/whatsapp/schedule-send', formData);
    alert('Envío programado correctamente');
  } catch (error) {
    alert('Error al programar el envío');
    console.error(error);
  }
};

const fetchGroups = async () => {
  const res = await axios.get('http://localhost:3000/whatsapp/groups');
  groups.value = res.data;
};

onMounted(fetchGroups);
</script>

<style scoped>
.container {
  max-width: 600px;
}
</style>
