export class PlayerAtlas {
  public image: HTMLImageElement;
  public isLoaded: boolean = false;

  //private frameWidth: number = 42.66;
  //private frameHeight: number = 66.66;

  constructor(imageSrc: string) {
    this.image = new Image();
    this.image.src = imageSrc;
    this.image.onload = () => {
      this.isLoaded = true;
    };
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    row: number,
    col: number,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number,
  ) {
    if (!this.isLoaded) return false;

    const sx = Math.floor((col - 1) * 42.66) + 3;
    const sy = Math.floor((row - 1) * 66.66) + 2;

    ctx.drawImage(this.image, sx, sy, 38, 62, dx, dy, dWidth, dHeight);
    return true;
  }
}
