import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core'; // Importación necesaria para convertir rutas de archivo

// Interfaz UserPhoto que define la estructura de la foto
export interface UserPhoto {
  filepath: string;
  webviewPath?: string; // webviewPath es opcional
}

@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  public photos: UserPhoto[] = [];
  private PHOTO_STORAGE: string = 'photos';
  private platform: Platform; // Clave para almacenamiento local

  constructor(platform: Platform) {
    this.loadSavedPhotos(); // Cargar las fotos al iniciar el servicio
    this.platform = platform;
  }
  public async deletePicture(photo: UserPhoto, position: number) {
    // Remove this photo from the Photos reference data array
    this.photos.splice(position, 1);
  
    // Update photos array cache by overwriting the existing photo array
    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos)
    });
  
    // delete photo file from filesystem
    const filename = photo.filepath
                        .substr(photo.filepath.lastIndexOf('/') + 1);
  
    await Filesystem.deleteFile({
      path: filename,
      directory: Directory.Data
    });
  }
  // Cargar fotos guardadas desde Preferences
  public async loadSaved() {
    // Retrieve cached photo array data
    const { value } = await Preferences.get({ key: this.PHOTO_STORAGE });
    this.photos = (value ? JSON.parse(value) : []) as UserPhoto[];
  
    // Easiest way to detect when running on the web:
    // “when the platform is NOT hybrid, do this”
    if (!this.platform.is('hybrid')) {
      // Display the photo by reading into base64 format
      for (let photo of this.photos) {
        // Read each saved photo's data from the Filesystem
        const readFile = await Filesystem.readFile({
            path: photo.filepath,
            directory: Directory.Data
        });
  
        // Web platform only: Load the photo as base64 data
        photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
      }
    }
  }

  // Método para tomar una foto y agregarla a la galería
  public async addNewToGallery() {
    // Tomar una foto usando la cámara del dispositivo
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri, // Devuelve un URI de la imagen capturada
      source: CameraSource.Camera,      // Usa la cámara como fuente
      quality: 100,                     // Calidad máxima de la imagen
    });

    // Guardar la foto tomada y agregarla a la colección de fotos
    const savedImageFile = await this.savePicture(capturedPhoto);
    this.photos.unshift(savedImageFile); // Agregar la foto al principio del array

    // Guardar la lista de fotos en el almacenamiento local
    await Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });

    console.log('Captured Photo:', savedImageFile);
    return savedImageFile;
  }
  

  // Método actualizado para guardar la imagen en el sistema de archivos
  private async savePicture(photo: Photo) {
    // Convertir la foto a formato base64, requerido por la API Filesystem para guardar
    const base64Data = await this.readAsBase64(photo);

    // Escribir el archivo en el directorio de datos
    const fileName = Date.now() + '.jpeg'; // Usar la fecha actual como nombre de archivo
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    });

    // Verificar si estamos en una plataforma híbrida (nativa)
    if (this.platform.is('hybrid')) {
      // Convertir la ruta 'file://' a una ruta accesible por HTTP
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri), // Ruta accesible por WebView
      };
    } else {
      // En plataformas web, usar la ruta webPath
      return {
        filepath: fileName,
        webviewPath: photo.webPath,
      };
    }
  }

  // Método para leer la foto como base64 (maneja híbrido o web)
  private async readAsBase64(photo: Photo) {
    if (this.platform.is('hybrid')) {
      // Si estamos en una plataforma híbrida, leer el archivo como base64
      const file = await Filesystem.readFile({
        path: photo.path!,
      });
      return file.data;
    } else {
      // En plataformas web, obtener la foto y convertirla en base64
      const response = await fetch(photo.webPath!);
      const blob = await response.blob();
      return await this.convertBlobToBase64(blob) as string;
    }
  }

  // Convertir un Blob a base64
  private convertBlobToBase64(blob: Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  }

  // Cargar las fotos guardadas desde el almacenamiento local
  private async loadSavedPhotos() {
    const { value } = await Preferences.get({ key: this.PHOTO_STORAGE });
    if (value) {
      this.photos = JSON.parse(value);

      // Leer las fotos desde el sistema de archivos y convertirlas a base64
      for (let photo of this.photos) {
        // Leer cada foto guardada desde el Filesystem
        const readFile = await Filesystem.readFile({
          path: photo.filepath,
          directory: Directory.Data,
        });
      }
    }
  }

  
}
