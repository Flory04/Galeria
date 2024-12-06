import { Component } from '@angular/core';
import { PhotoService } from '../services/photo.service';
import { ActionSheetController } from '@ionic/angular';
import { UserPhoto } from '../services/photo.service';


@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page {
  constructor(public photoService: PhotoService,
    public actionSheetController: ActionSheetController) {}
  
  async ngOnInit() {
    await this.photoService.loadSaved();
  }
  // Método que llama al servicio para agregar una foto a la galería
  addPhotoToGallery() {
    this.photoService.addNewToGallery(); // Llamar al servicio que toma la foto y la guarda
  
  }
  public async showActionSheet(photo: UserPhoto, position: number) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Photos',
      buttons: [{
        text: 'Delete',
        role: 'destructive',
        icon: 'trash',
        handler: () => {
          this.photoService.deletePicture(photo, position);
        }
      }, {
        text: 'Cancel',
        icon: 'close',
        role: 'cancel',
        handler: () => {
          // Nothing to do, action sheet is automatically closed
          }
      }]
    });
    await actionSheet.present();
  }

}

