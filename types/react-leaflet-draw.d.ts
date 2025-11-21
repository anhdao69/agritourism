declare module 'react-leaflet-draw' {
  import { Control } from 'leaflet';
  import { ComponentType } from 'react';

  export interface EditControlProps {
    position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
    onCreated?: (e: any) => void;
    onEdited?: (e: any) => void;
    onDeleted?: (e: any) => void;
    onMounted?: (drawControl: Control.Draw) => void;
    draw?: {
      polyline?: boolean | object;
      polygon?: boolean | object;
      rectangle?: boolean | object;
      circle?: boolean | object;
      marker?: boolean | object;
      circlemarker?: boolean | object;
    };
    edit?: {
      edit?: boolean | object;
      remove?: boolean | object;
    };
  }

  export const EditControl: ComponentType<EditControlProps>;
}