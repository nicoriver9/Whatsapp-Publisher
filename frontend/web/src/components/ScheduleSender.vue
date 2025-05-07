<template>
  <div class="container mt-4">
    <div class="text-center mb-4">
      <img src="/img/logo.png" alt="Logo" class="logo-img" />
    </div>
    <h3 v-if="!isReady">Escaneá el código QR para conectar WhatsApp</h3>

    <!-- Mostrar QR si es necesario -->
    <div v-if="qrCode && !isReady" class="text-center mb-4">
      <img :src="qrCode" alt="QR de WhatsApp" class="qr-img" />
      <p class="mt-2">Escaneá este código con tu WhatsApp</p>
      <button class="btn btn-warning mt-2" @click="restartClient">
        Reiniciar Cliente
      </button>
    </div>

    <!-- Interfaz principal si WhatsApp ya está listo -->
    <div v-if="isReady">
      <h3>Programar Envío de Archivos a Grupos de WhatsApp</h3>

      <!-- Subir nuevos archivos -->
      <div class="mb-4">
        <label class="form-label">Seleccionar Archivos</label>
        <input
          type="file"
          class="form-control"
          multiple
          @change="handleFiles"
        />
        <button class="btn btn-success mt-2" @click.prevent="uploadFiles">
          Subir Archivos
        </button>
      </div>

      <hr />

      <!-- Lista de archivos cargados -->
      <div v-if="uploadedFiles.length">
        <h5 class="mb-4">Programar por Archivos Cargados</h5>
        <div
          v-for="(file, index) in uploadedFiles"
          :key="file.name"
          class="card mb-3 p-3"
        >
          <div class="d-flex align-items-center justify-content-between mb-2">
            <div class="d-flex align-items-center">
              <i class="bi bi-file-earmark-text-fill me-2 text-info fs-5"></i>
              <strong>{{ file.name }}</strong>
            </div>
            <button
              class="btn btn-sm btn-outline-danger"
              @click="removeFile(index)"
            >
              Eliminar
            </button>
          </div>

          <!-- Selección de grupos -->
          <div class="mt-2">
            <label class="form-label">Tus Grupos de Whatsapp</label>
            <select multiple v-model="file.selectedGroups" class="form-select">
              <option v-for="group in groups" :key="group.id" :value="group.id">
                {{ group.name }}
              </option>
            </select>
          </div>

          <!-- Horario -->
          <div class="mt-2">
            <label class="form-label">Fecha y Hora de Envío</label>
            <input
              type="datetime-local"
              class="form-control"
              v-model="file.scheduledTime"
            />
          </div>

          <!-- Botón para programar -->
          <button class="btn btn-primary mt-3" @click="scheduleFile(file)">
            Programar Envío
          </button>
          <p v-if="file.confirmationText" class="mt-2 text-success small">
            {{ file.confirmationText }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import axios from "axios";

interface UploadedFile {
  name: string;
  scheduledTime: string;
  selectedGroups: string[];
  confirmationText?: string; // ✅ la clave para evitar el error
}

const files = ref<File[]>([]);
const uploadedFiles = ref<UploadedFile[]>([]);
const groups = ref<{ id: string; name: string }[]>([]);
const qrCode = ref<string | null>(null);
const isReady = ref(false);

const removeFile = (index: number) => {
  uploadedFiles.value.splice(index, 1);
};

// Escuchar estado de WhatsApp (QR, autenticado, listo)
const checkClientStatus = async () => {
  try {
    const res = await axios.get("http://localhost:3000/whatsapp/get-qr");

    if (res.data.qrCode) {
      qrCode.value = res.data.qrCode;
      isReady.value = false;
    } else if (res.data.message === "ready") {
      isReady.value = true;
      fetchGroups();
      fetchUploadedFiles();
    } else {
      console.log("Esperando QR...");
    }
  } catch (error) {
    console.error("Error al verificar el estado del cliente:", error);
  }
};

// Reiniciar cliente de WhatsApp
const restartClient = async () => {
  try {
    await axios.post("http://localhost:3000/whatsapp/restart-client");
    alert("Cliente reiniciado, esperando nuevo QR...");
    qrCode.value = null;
    isReady.value = false;
    checkClientStatus(); // forzar nuevo intento
  } catch (error) {
    console.error("Error al reiniciar el cliente:", error);
    alert("No se pudo reiniciar el cliente");
  }
};

// Subir archivos al backend
const handleFiles = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    files.value = Array.from(target.files);
  }
};

const uploadFiles = async () => {
  if (!files.value.length) return alert("Seleccioná archivos para subir");

  const formData = new FormData();
  files.value.forEach((file) => formData.append("files", file));

  try {
    await axios.post("http://localhost:3000/whatsapp/upload-files", formData);
    alert("Archivos subidos correctamente");
    fetchUploadedFiles();
  } catch (error) {
    console.error(error);
    alert("Error al subir los archivos");
  }
};

const fetchUploadedFiles = async () => {
  const res = await axios.get("http://localhost:3000/whatsapp/uploaded-files");
  uploadedFiles.value = res.data.map((f: any) => ({
    name: f.name,
    scheduledTime: "",
    selectedGroups: [],
    confirmationText: "", // ✅ nuevo
  }));
};

const fetchGroups = async () => {
  const res = await axios.get("http://localhost:3000/whatsapp/groups");
  groups.value = res.data;
};

const scheduleFile = async (file: UploadedFile) => {
  if (!file.scheduledTime || !file.selectedGroups.length) {
    return alert("Completá todos los campos para este archivo");
  }

  try {
    await axios.post("http://localhost:3000/whatsapp/schedule-file", {
      filename: file.name,
      groupIds: file.selectedGroups,
      scheduledTime: file.scheduledTime,
    });

    // ✅ Mostrar confirmación con fecha y hora programada
    const fecha = new Date(file.scheduledTime);
    const dia = fecha.toLocaleDateString();
    const hora = fecha.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    file.confirmationText = `✅ Envío programado para el ${dia} a las ${hora}`;
    alert(`Archivo "${file.name}" programado con éxito`);
  } catch (error) {
    console.error(error);
    alert("Error al programar el envío");
  }
};

// Iniciar verificación de cliente al montar
onMounted(() => {
  checkClientStatus();
  const interval = setInterval(() => {
    if (!isReady.value) {
      checkClientStatus();
    }
  }, 3000);
});
</script>

<style scoped>
body {
  background-color: #121212;
  color: #e0e0e0;
}

strong {
  color: #ffffff;
  font-weight: 500;
  font-size: 1rem;
  word-break: break-word;
}

.container {
  max-width: 750px;
  background-color: #1e1e1e;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 0 10px #000;
}

h3,
h5 {
  color: #ffffff;
}

.form-label {
  color: #bdbdbd;
}

.form-control,
.form-select {
  background-color: #2c2c2c;
  border: 1px solid #444;
  color: #e0e0e0;
}

.form-control:focus,
.form-select:focus {
  border-color: #6ab7ff;
  box-shadow: 0 0 0 0.2rem rgba(106, 183, 255, 0.25);
}

.card {
  background-color: #2a2a2a;
  border: 1px solid #333;
  border-radius: 8px;
}

.qr-img {
  max-width: 250px;
  border: 2px solid #444;
  border-radius: 12px;
  box-shadow: 0 0 5px #6ab7ff;
}

button {
  font-weight: 500;
}

.btn-primary {
  background-color: #1976d2;
  border-color: #1565c0;
}

.btn-primary:hover {
  background-color: #1565c0;
}

.btn-success {
  background-color: #2e7d32;
  border-color: #1b5e20;
}

.btn-success:hover {
  background-color: #1b5e20;
}

.btn-warning {
  background-color: #ffa000;
  border-color: #ff8f00;
  color: #000;
}

.btn-warning:hover {
  background-color: #ff8f00;
  color: #000;
}

.logo-img {
  max-width: 180px;
  margin-bottom: 1rem;
  filter: drop-shadow(0 0 6px rgba(106, 183, 255, 0.5));
  transition: transform 0.3s ease;
}

.logo-img:hover {
  transform: scale(1.05);
}

</style>
