FROM public.ecr.aws/lambda/python:3.11

# 1. Install System Dependencies (Required for OpenCV to run)
RUN yum update -y && \
    yum install -y mesa-libGL glib2 && \
    yum clean all

# Set the working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy function code
COPY lambda_function.py .

# Lambda handler location
CMD ["lambda_function.lambda_handler"]