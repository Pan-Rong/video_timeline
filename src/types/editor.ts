export interface IOption {
    label: string;
    value: string | number;
    [key: string]: any;
}

export interface IModel {
    [key: string]: any;
}

export interface IShadow {
    color: string;
    offsetX: number;
    offsetY: number;
    blur?: number;
}

export interface IFont {
    fontSize: number;
    fontFamily: string;
    fontColor: string;
    shadow: IShadow;
    position?: number;
    showShadow?: boolean;
    maxMoveY?: number;
    minMoveY?: number;
}