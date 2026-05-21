import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';

@Pipe({
  name: 'mediaUrl',
  standalone: true,
  pure: true
})
export class MediaUrlPipe implements PipeTransform {
  transform(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    const base = (environment.apiBaseUrl || '/api/v1').replace(/\/$/, '');
    const path = url.startsWith('/') ? url : '/' + url;

    if (path.startsWith('/uploads/')) {
      return `${base}/media${path}`;
    }

    if (path.startsWith('/media/')) {
      return `${base}${path}`;
    }

    return `${base}/media/files${path}`;
  }
}
