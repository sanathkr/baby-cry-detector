import os, sys, shutil, logging

from starlette.applications import Starlette
from starlette.responses import HTMLResponse, JSONResponse
from starlette.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import uvicorn
from fastai.basic_train import *
from fastai.vision import *

from spectrogram import generate_spectrogram
from prometheus_client import start_http_server, Gauge

logging.basicConfig(format="%(levelname)s %(asctime)s: %(message)s")

cry_metric = Gauge('crying', "Jittu's night time crying")

app = Starlette()
app.add_middleware(CORSMiddleware, allow_origins=['*'])
app.mount('/static', StaticFiles(directory='static'))

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
data_bunch = ImageDataBunch.single_from_classes(path, [0, 1],
    ds_tfms=get_transforms(do_flip=False, max_rotate=0., max_lighting=0., max_warp=0.),
    size=224).normalize(imagenet_stats)
learn = cnn_learner(data_bunch, models.resnet34, pretrained=False)
learn.load('stage-2')

@app.route('/')
def index(request):
    html = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'view', 'index.html')
    return HTMLResponse(open(html, 'r', encoding='utf-8').read())

@app.route('/analyze', methods=['POST'])
async def analyze(request):
    data = await request.form()
    audio = await (data['file'].read())
    uploadpath = os.path.join(path, 'uploads')
    try:
        os.makedirs(uploadpath)
        filepath = os.path.join(uploadpath, 'test.wav')
        with open(filepath, 'wb') as f: f.write(audio)
        img = open_image(generate_spectrogram(filepath))
    finally:
        shutil.rmtree(uploadpath)

    category = learn.predict(img)[0]
    is_crying = int(category)

    cry_metric.set(is_crying)
    return JSONResponse({'crying': is_crying})

if __name__ == '__main__':
    if 'run' in sys.argv:
        start_http_server(5000)
        uvicorn.run(app, host='localhost', port=5042)