import {
  ComponentFactoryResolver,
  ComponentRef,
  OnDestroy,
  ViewContainerRef,
} from '@angular/core';
import { isFunction, isNullOrUndefined, isArray } from 'util';
import { isObservable } from 'rxjs';
import { DynamicComponentConfig } from './dynamic-component.interface';
import * as _ from 'lodash';

export class DynamicComponent implements OnDestroy {
  private loadedContainer: ComponentRef<any>[] = [];
  private _configs: DynamicComponentConfig[] = [];

  constructor(
    public componentResolver: ComponentFactoryResolver,
  ) {}

  get configs(): DynamicComponentConfig[] {
    return this._configs;
  }
  set configs(_configs: DynamicComponentConfig[]) {
    this._configs = _configs;
  }

  ngOnDestroy() {
    if (this.loadedContainer.length) {
      this.loadedContainer.forEach((loadedContainer: ComponentRef<any>) => loadedContainer.destroy());
    }
  }

  loadDynamicComponents(): ComponentRef<any>[] {
    if (isArray(this.configs) && this.configs.length) {
      this.configs.forEach((component: DynamicComponentConfig) => this.load(component));
    }
    return this.loadedContainer;
  }

  /**
   *
   * @param component component loading
   * @param inputs must be object with: key(variable name of input), value(data to set of input)
   */
  load(config: DynamicComponentConfig): void {
    const componentRef = this.componentResolver.resolveComponentFactory(config.component);
    const container = config.container.createComponent(componentRef);

    if (!this.loadedContainer.includes(container)) {
      this.loadedContainer.push(container);
    }

    this._setDataToComponent(config.inputs);

    _.last(this.loadedContainer).changeDetectorRef.detectChanges();
  }

  getComponentConfig(_component: any, _container: ViewContainerRef, _inputs: any): DynamicComponentConfig {
    return { component: _component, container: _container, inputs: _inputs };
  }

  private _setDataToComponent(inputs: any): void {
    if (inputs) {
      const loadedContainer = _.last(this.loadedContainer);

      Object.keys(inputs).forEach((key: string) => {
        if (isObservable(loadedContainer.instance[key])) {
          loadedContainer.instance[key].subscribe((subscribed?) => {
            if (isFunction(inputs[key]) && !isNullOrUndefined(subscribed)) {
              inputs[key](subscribed);
            } else if (isFunction(inputs[key]) && isNullOrUndefined(subscribed)) {
              inputs[key]();
            } else if (!isFunction(inputs[key]) && !isNullOrUndefined(subscribed)) {
              inputs[key] = subscribed;
            }
          });
        } else {
          loadedContainer.instance[key] = inputs[key];
        }
      });
    }
  }

}
