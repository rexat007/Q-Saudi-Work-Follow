import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {LocaleResource} from '../locales/types';
import ar from '../locales/ar'; import en from '../locales/en'; import ur from '../locales/ur';
export type Locale='ar'|'en'|'ur';
export const LOCALES:Record<Locale,{label:string;dir:'rtl'|'ltr'}>={ar:{label:'العربية',dir:'rtl'},en:{label:'English',dir:'ltr'},ur:{label:'اردو',dir:'rtl'}};
const resources:Record<Locale,LocaleResource>={ar,en,ur}; const STORAGE_KEY='q-swf-locale';
type I18nContextValue={locale:Locale;dir:'rtl'|'ltr';resource:LocaleResource;setLocale:(locale:Locale)=>void;t:(path:string)=>string};
const I18nContext=createContext<I18nContextValue|null>(null);
function readInitialLocale():Locale{if(typeof window==='undefined')return'ar';const stored=window.localStorage.getItem(STORAGE_KEY) as Locale|null;return stored&&stored in resources?stored:'ar';}
function resolvePath(resource:LocaleResource,path:string):string|undefined{const value=path.split('.').reduce<unknown>((current,segment)=>current&&typeof current==='object'&&segment in current?(current as Record<string,unknown>)[segment]:undefined,resource);return typeof value==='string'?value:undefined;}
export function I18nProvider({children}:{children:React.ReactNode}){const[locale,setLocaleState]=useState<Locale>(readInitialLocale);const dir=LOCALES[locale].dir;const resource=resources[locale];const setLocale=(next:Locale)=>{setLocaleState(next);if(typeof window!=='undefined')window.localStorage.setItem(STORAGE_KEY,next);};useEffect(()=>{document.documentElement.lang=locale;document.documentElement.dir=dir;document.body.dir=dir;const syncRoot=()=>{const root=document.querySelector('#root > div');if(root)root.setAttribute('dir',dir);};syncRoot();const observer=new MutationObserver(syncRoot);observer.observe(document.getElementById('root')!,{childList:true,subtree:false});return()=>observer.disconnect();},[locale,dir]);const value=useMemo<I18nContextValue>(()=>({locale,dir,resource,setLocale,t:(path:string)=>resolvePath(resource,path)??`[missing:${locale}:${path}]`}),[locale,dir,resource]);return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;}
export function useI18n(){const context=useContext(I18nContext);if(!context)throw new Error('useI18n must be used inside I18nProvider');return context;}
export function getLocaleResource(locale:Locale):LocaleResource{return resources[locale];}
