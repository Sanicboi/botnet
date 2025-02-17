FROM python:latest
WORKDIR /app
EXPOSE 6667
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . . 
CMD ["flask", "--app", "./src/investAPI/main.py", "run"]