import { NgModule, Optional, SkipSelf } from '@angular/core';

@NgModule({})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule?: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import it only once at root level.');
    }
  }
}
