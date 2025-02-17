# This file is just a simple python t invest api wrapper to simplify the work in js


from flask import Flask
from tinkoff.invest import Client
from os import getenv
from openai import OpenAI
import json
import asyncio

TOKEN = getenv('T_INVEST_TOKEN')

oai = OpenAI(api_key=getenv("OPENAI_KEY"))

with Client(TOKEN) as client:
    app = Flask(__name__)

    @app.route("/api/active/<ticker>")
    async def get_active_data(ticker):  
        bond = client.instruments.bond_by(id_type=2, id=ticker)
        lastPrices = client.market_data.get_last_prices(instrument_id=bond.instrument.uid)
        candles = client.market_data.get_candles(instrument_id=bond.instrument.uid)

        bondAnalysis =  oai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "developer",
                    "content": "Ты - инвестиционный аналитик. Тебе будет дана акция в формате JSON. Проанализируй ее. Поля включают в себя: klong - Коэффициент ставки риска короткой позиции по клиенту. kshort - Коэффициент ставки риска короткой позиции по клиенту. dlong - Ставка риска начальной маржи для КСУР лонг. dshort - Ставка риска начальной маржи для КСУР шорт. И так далее. сделай максимально подробный финансовый анализ."
                },
                {
                    "role": "user",
                    "content": json.dumps(bond)
                }
            ]
        )

        lastPriceAnalysis =  oai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "developer",
                    "content": "Ты - инвестиционный аналитик. Проведи анализ данных тебе данных об акции о последних ценах"
                },
                {
                    "role": "user",
                    "content": json.dumps(lastPrices)
                }
            ]
        )

        candleAnalysis =  oai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "developer",
                    "content": "Ты - инвестиционный аналитик. Проанализируй данные о свечах акции."
                },
                {
                    "role": "user",
                    "content": json.dumps(candles)
                }
            ]
        )

        return app.response_class(
            response=json.dumps({
            "bond": bondAnalysis.choices[0].message.content,
            "candle": candleAnalysis.choices[0].message.content,
            "lastPrice": lastPriceAnalysis.choices[0].message.content
        }),
        status=200,
        mimetype="application/json"
        )
    app.run(port=6667)

    