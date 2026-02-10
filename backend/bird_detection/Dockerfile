# Use AWS Lambda Python runtime
FROM public.ecr.aws/lambda/python:3.10

# Install system dependencies needed for OpenCV and other packages
RUN yum update -y && yum install -y \
    mesa-libGL \
    libXext \
    libSM \
    libXrender \
    && yum clean all

# Copy requirements and install Python dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r requirements.txt

# Install additional packages
RUN pip install ultralytics boto3

# Copy the application code
COPY detect_birds.py ${LAMBDA_TASK_ROOT}/
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}/

# Set environment variables
ENV YOLO_CONFIG_DIR=/tmp
ENV PYTHONPATH=${LAMBDA_TASK_ROOT}

# Set the Lambda handler
CMD ["lambda_handler.lambda_handler"]