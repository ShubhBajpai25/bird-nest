FROM public.ecr.aws/lambda/python:3.10

# install python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy code & model
COPY birdnet_analyzer ${LAMBDA_TASK_ROOT}/birdnet_analyzer
COPY lambda_function.py  ${LAMBDA_TASK_ROOT}/
COPY model               ${LAMBDA_TASK_ROOT}/model

ENV MODEL_PATH=/var/task/model/BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite \
    MDATA_MODEL_PATH=/var/task/model/BirdNET_GLOBAL_6K_V2.4_MData_Model_V2_FP16.tflite \
    LABELS_FILE=/var/task/model/BirdNET_GLOBAL_6K_V2.4_Labels.txt

CMD ["lambda_function.lambda_handler"]